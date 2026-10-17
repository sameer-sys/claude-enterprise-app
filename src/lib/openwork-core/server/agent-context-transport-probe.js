import { readFile } from "node:fs/promises";
import { isIP } from "node:net";
import tls from "node:tls";
import { sanitizeDiagnosticString } from "./diagnostic-sanitizer.js";
const DEFAULT_TIMEOUT_MS = 6_000;
const MAX_ENDPOINT_LENGTH = 2 * 1024;
const REQUIRED_TERMINAL_PATH = "/mcp/agent";
const MAX_CERT_FIELD_CHARS = 120;
const MAX_CHAIN_ENTRIES = 5;
const TLS_VERSION_FALLBACK_TIMEOUT_MS = 1_500;
const tlsWithOptionalCa = tls;
const defaultTlsModule = {
    connect: (options, secureConnectListener) => tls.connect(options, secureConnectListener),
    getCACertificates: tlsWithOptionalCa.getCACertificates,
};
function isRecord(value) {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}
function isLoopbackHostname(hostname) {
    const value = hostname.toLowerCase();
    if (value === "localhost" || value === "::1" || value === "[::1]")
        return true;
    const match = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(value);
    if (!match)
        return false;
    return Number(match[1]) === 127 && match.slice(1).every((part) => Number(part) <= 255);
}
function safeTransportEndpoint(rawValue) {
    if (rawValue === null)
        return "missing_endpoint";
    const raw = rawValue.trim();
    if (!raw || raw.length > MAX_ENDPOINT_LENGTH || raw.includes("?") || raw.includes("#"))
        return "invalid_endpoint";
    if (/^[a-z][a-z0-9+.-]*:\/\/[^/?#]*@/iu.test(raw))
        return "invalid_endpoint";
    try {
        const url = new URL(raw);
        if (url.username || url.password || url.search || url.hash)
            return "invalid_endpoint";
        if (url.protocol !== "https:" && !(url.protocol === "http:" && isLoopbackHostname(url.hostname))) {
            return "invalid_endpoint";
        }
        if (!url.pathname.endsWith(REQUIRED_TERMINAL_PATH) || url.pathname.endsWith(REQUIRED_TERMINAL_PATH + "/")) {
            return "invalid_endpoint";
        }
        if (url.origin !== raw.slice(0, raw.length - url.pathname.length))
            return "invalid_endpoint";
        return {
            url,
            skipReason: url.protocol === "http:" ? "http_loopback_no_tls" : null,
        };
    }
    catch {
        return "invalid_endpoint";
    }
}
function boundedDiagnosticString(value, maxChars) {
    const sanitized = sanitizeDiagnosticString(value).trim().slice(0, maxChars);
    return sanitized || null;
}
function endpointOrigin(url) {
    return boundedDiagnosticString(url.origin, 240);
}
function endpointProtocol(url) {
    if (!url)
        return null;
    if (url.protocol === "https:" || url.protocol === "http:")
        return url.protocol;
    return null;
}
function errorCode(error) {
    if (isRecord(error) && typeof error.code === "string") {
        return boundedDiagnosticString(error.code, MAX_CERT_FIELD_CHARS);
    }
    if (error instanceof Error)
        return boundedDiagnosticString(error.message, MAX_CERT_FIELD_CHARS);
    return boundedDiagnosticString(String(error), MAX_CERT_FIELD_CHARS);
}
function isCertificateVerificationError(code) {
    if (code === null)
        return false;
    const value = code.toLowerCase();
    return value.includes("cert")
        || value.includes("certificate")
        || value.includes("tls")
        || value.includes("ssl")
        || value.includes("unable_to_")
        || value.includes("depth_zero")
        || value.includes("self_signed");
}
function networkEvidenceForError(code) {
    if (code === null)
        return { dnsResolved: null, tcpConnected: null };
    const value = code.toLowerCase();
    if (value.includes("enotfound") || value.includes("eai_again") || value.includes("getaddrinfo")) {
        return { dnsResolved: false, tcpConnected: false };
    }
    if (value.includes("econnrefused"))
        return { dnsResolved: true, tcpConnected: false };
    if (isCertificateVerificationError(code))
        return { dnsResolved: true, tcpConnected: true };
    if (value.includes("econnreset") || value.includes("epipe") || value.includes("socket hang up")) {
        return { dnsResolved: true, tcpConnected: true };
    }
    return { dnsResolved: null, tcpConnected: null };
}
function endpointPort(url) {
    if (!url.port)
        return 443;
    const port = Number(url.port);
    return Number.isInteger(port) && port > 0 && port <= 65_535 ? port : 443;
}
function stripIpv6HostnameBrackets(hostname) {
    return hostname.startsWith("[") && hostname.endsWith("]") ? hostname.slice(1, -1) : hostname;
}
function tlsOptions(url, rejectUnauthorized, version) {
    const host = stripIpv6HostnameBrackets(url.hostname);
    const options = {
        host,
        port: endpointPort(url),
        rejectUnauthorized,
        ALPNProtocols: ["http/1.1"],
    };
    if (version) {
        options.minVersion = version;
        options.maxVersion = version;
    }
    // SNI forbids IP literals; Node throws ERR_INVALID_ARG_VALUE if servername is an IP address.
    if (isIP(host) === 0)
        options.servername = host;
    return options;
}
function connectTls(input) {
    input.signal?.throwIfAborted();
    return new Promise((resolve, reject) => {
        let socket = null;
        let settled = false;
        const settle = (result) => {
            if (settled)
                return;
            settled = true;
            input.signal?.removeEventListener("abort", onAbort);
            if (socket) {
                socket.removeListener("error", onError);
                socket.destroy();
            }
            resolve(result);
        };
        const fail = (error) => {
            const code = errorCode(error);
            settle({ status: "failed", errorCode: code, ...networkEvidenceForError(code) });
        };
        const onError = (error) => fail(error);
        const onAbort = () => {
            if (settled)
                return;
            settled = true;
            if (socket) {
                socket.removeListener("error", onError);
                socket.destroy();
            }
            reject(input.signal?.reason ?? new Error("Transport probe aborted"));
        };
        input.signal?.addEventListener("abort", onAbort, { once: true });
        try {
            socket = input.connector(tlsOptions(input.url, input.rejectUnauthorized, input.version), () => {
                const certificate = input.inspectPeerCertificate && socket ? socket.getPeerCertificate(true) : null;
                settle({ status: "ok", certificate, protocol: socket?.getProtocol?.() ?? null });
            });
            socket.once("error", onError);
            socket.setTimeout(input.timeoutMs, () => {
                settle({ status: "failed", errorCode: "ETIMEDOUT", dnsResolved: null, tcpConnected: null });
            });
        }
        catch (error) {
            input.signal?.removeEventListener("abort", onAbort);
            fail(error);
        }
    });
}
function certificateField(value) {
    return typeof value === "string" ? boundedDiagnosticString(value, MAX_CERT_FIELD_CHARS) : null;
}
function servedChainFromCertificate(certificate) {
    if (!certificate || Object.keys(certificate).length === 0)
        return [];
    const chain = [];
    const seen = new Set();
    let current = certificate;
    while (current && chain.length < MAX_CHAIN_ENTRIES && !seen.has(current)) {
        seen.add(current);
        const subjectCN = certificateField(current.subject?.CN);
        const issuerCN = certificateField(current.issuer?.CN);
        chain.push({
            subjectCN,
            issuerCN,
            selfIssued: current.issuerCertificate === current || (subjectCN !== null && subjectCN === issuerCN),
            notAfter: certificateField(current.valid_to),
        });
        if (!current.issuerCertificate || current.issuerCertificate === current)
            break;
        current = current.issuerCertificate;
    }
    return chain;
}
function caCertificateCount(tlsModule, type) {
    try {
        const certificates = tlsModule.getCACertificates?.(type);
        return Array.isArray(certificates) ? certificates.length : null;
    }
    catch {
        return null;
    }
}
async function timeoutVersionEvidence(input) {
    const timeoutMs = Math.min(input.timeoutMs, TLS_VERSION_FALLBACK_TIMEOUT_MS);
    const tls13 = await connectTls({
        url: input.url,
        rejectUnauthorized: true,
        version: "TLSv1.3",
        connector: input.connector,
        timeoutMs,
        inspectPeerCertificate: false,
        signal: input.signal,
    });
    const tls12 = await connectTls({
        url: input.url,
        rejectUnauthorized: true,
        version: "TLSv1.2",
        connector: input.connector,
        timeoutMs,
        inspectPeerCertificate: false,
        signal: input.signal,
    });
    return {
        tls13Handshake: tls13.status === "ok" ? "ok" : "failed",
        tls13ErrorCode: tls13.status === "ok" ? null : tls13.errorCode,
        tls12Handshake: tls12.status === "ok" ? "ok" : "failed",
        tls12ErrorCode: tls12.status === "ok" ? null : tls12.errorCode,
        tls12Protocol: tls12.status === "ok" ? tls12.protocol : null,
    };
}
async function extraCaEvidence(input) {
    const extraCaPath = input.env.NODE_EXTRA_CA_CERTS;
    if (!extraCaPath) {
        return { nodeExtraCaCertsSet: false, nodeExtraCaCertsFileReadable: null, nodeExtraCaCertsCertCount: null };
    }
    try {
        const contents = await (input.caFileReader ?? ((path) => readFile(path, "utf8")))(extraCaPath);
        return {
            nodeExtraCaCertsSet: true,
            nodeExtraCaCertsFileReadable: true,
            nodeExtraCaCertsCertCount: contents.match(/-----BEGIN CERTIFICATE-----/g)?.length ?? 0,
        };
    }
    catch {
        return { nodeExtraCaCertsSet: true, nodeExtraCaCertsFileReadable: false, nodeExtraCaCertsCertCount: null };
    }
}
export async function probeCloudEndpointTransport(input) {
    const tlsModule = input.tlsModule ?? defaultTlsModule;
    const env = input.env ?? process.env;
    const localTrust = {
        systemCaCertificateCount: caCertificateCount(tlsModule, "system"),
        bundledCaCertificateCount: caCertificateCount(tlsModule, "default"),
        ...await extraCaEvidence({ env, caFileReader: input.caFileReader }),
    };
    const prepared = safeTransportEndpoint(input.endpointUrl);
    const endpoint = typeof prepared === "string" ? null : prepared;
    const base = {
        endpointOrigin: endpoint ? endpointOrigin(endpoint.url) : null,
        endpointProtocol: endpointProtocol(endpoint?.url ?? null),
        tls13Handshake: null,
        tls13ErrorCode: null,
        tls12Handshake: null,
        tls12ErrorCode: null,
        tls12Protocol: null,
        ...localTrust,
    };
    const skipReason = typeof prepared === "string"
        ? prepared
        : !input.performProbe
            ? "perform_probe_false"
            : prepared.skipReason;
    if (skipReason || !endpoint) {
        return {
            ...base,
            skipReason,
            performed: false,
            verifiedHandshake: "not-performed",
            verifyErrorCode: null,
            dnsResolved: null,
            tcpConnected: null,
            servedChain: [],
            servedChainLength: null,
        };
    }
    const timeoutMs = Math.max(1, Math.min(input.timeoutMs ?? DEFAULT_TIMEOUT_MS, DEFAULT_TIMEOUT_MS));
    const connector = input.connector ?? tlsModule.connect;
    const verified = await connectTls({
        url: endpoint.url,
        rejectUnauthorized: true,
        connector,
        timeoutMs,
        inspectPeerCertificate: false,
        signal: input.signal,
    });
    if (verified.status === "ok") {
        return {
            ...base,
            skipReason: null,
            performed: true,
            verifiedHandshake: "ok",
            verifyErrorCode: null,
            dnsResolved: true,
            tcpConnected: true,
            servedChain: [],
            servedChainLength: null,
        };
    }
    let servedChain = [];
    const versionEvidence = verified.errorCode === "ETIMEDOUT"
        ? await timeoutVersionEvidence({ url: endpoint.url, connector, timeoutMs, signal: input.signal })
        : null;
    const certificateVerificationFailure = isCertificateVerificationError(verified.errorCode);
    if (certificateVerificationFailure) {
        const chainAttempt = await connectTls({
            url: endpoint.url,
            rejectUnauthorized: false,
            connector,
            timeoutMs,
            inspectPeerCertificate: true,
            signal: input.signal,
        });
        if (chainAttempt.status === "ok")
            servedChain = servedChainFromCertificate(chainAttempt.certificate);
    }
    return {
        ...base,
        ...(versionEvidence ?? {}),
        skipReason: null,
        performed: true,
        verifiedHandshake: "failed",
        verifyErrorCode: verified.errorCode,
        dnsResolved: verified.dnsResolved,
        tcpConnected: verified.tcpConnected,
        servedChain,
        servedChainLength: certificateVerificationFailure ? servedChain.length : null,
    };
}
export function isCloudEndpointCertificateVerificationFailure(probe) {
    return probe.verifiedHandshake === "failed" && isCertificateVerificationError(probe.verifyErrorCode);
}
