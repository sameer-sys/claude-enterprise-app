export function matchRoute(routes, method, path) {
    for (const route of routes) {
        if (route.method !== method)
            continue;
        const match = path.match(route.regex);
        if (!match)
            continue;
        const params = {};
        route.keys.forEach((key, index) => {
            params[key] = decodeURIComponent(match[index + 1]);
        });
        return { ...route, params };
    }
    return null;
}
export function addRoute(routes, method, path, auth, handler) {
    const keys = [];
    const regex = pathToRegex(path, keys);
    routes.push({ method, regex, keys, auth, handler });
}
function pathToRegex(path, keys) {
    const pattern = path.replace(/:([A-Za-z0-9_]+)/g, (_, key) => {
        keys.push(key);
        return "([^/]+)";
    });
    return new RegExp(`^${pattern}$`);
}
