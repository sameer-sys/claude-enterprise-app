import { createRequire } from "node:module";
var __create = Object.create;
var __getProtoOf = Object.getPrototypeOf;
var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
function __accessProp(key) {
  return this[key];
}
var __toESMCache_node;
var __toESMCache_esm;
var __toESM = (mod, isNodeMode, target) => {
  var canCache = mod != null && typeof mod === "object";
  if (canCache) {
    var cache = isNodeMode ? __toESMCache_node ??= new WeakMap : __toESMCache_esm ??= new WeakMap;
    var cached = cache.get(mod);
    if (cached)
      return cached;
  }
  target = mod != null ? __create(__getProtoOf(mod)) : {};
  const to = isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target;
  for (let key of __getOwnPropNames(mod))
    if (!__hasOwnProp.call(to, key))
      __defProp(to, key, {
        get: __accessProp.bind(mod, key),
        enumerable: true
      });
  if (canCache)
    cache.set(mod, to);
  return to;
};
var __commonJS = (cb, mod) => () => (mod || cb((mod = { exports: {} }).exports, mod), mod.exports);
var __returnValue = (v) => v;
function __exportSetter(name, newValue) {
  this[name] = __returnValue.bind(null, newValue);
}
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, {
      get: all[name],
      enumerable: true,
      configurable: true,
      set: __exportSetter.bind(all, name)
    });
};
var __require = /* @__PURE__ */ createRequire(import.meta.url);

// src/opencode-plugins/openwork-office-attachments.ts
import { createHash } from "node:crypto";
import { lstat as lstat2, mkdir, realpath as realpath2 } from "node:fs/promises";
import { basename, isAbsolute as isAbsolute2, join, relative as relative2, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

// ../../node_modules/.pnpm/entities@4.5.0/node_modules/entities/lib/esm/generated/decode-data-html.js
var decode_data_html_default = new Uint16Array("ᵁ<Õıʊҝջאٵ۞ޢߖࠏ੊ઑඡ๭༉༦჊ረዡᐕᒝᓃᓟᔥ\x00\x00\x00\x00\x00\x00ᕫᛍᦍᰒᷝ὾⁠↰⊍⏀⏻⑂⠤⤒ⴈ⹈⿎〖㊺㘹㞬㣾㨨㩱㫠㬮ࠀEMabcfglmnoprstu\\bfms¦³¹ÈÏlig耻Æ䃆P耻&䀦cute耻Á䃁reve;䄂Āiyx}rc耻Â䃂;䐐r;쀀\uD835\uDD04rave耻À䃀pha;䎑acr;䄀d;橓Āgp¡on;䄄f;쀀\uD835\uDD38plyFunction;恡ing耻Å䃅Ācs¾Ãr;쀀\uD835\uDC9Cign;扔ilde耻Ã䃃ml耻Ä䃄ЀaceforsuåûþėĜĢħĪĀcrêòkslash;或Ŷöø;櫧ed;挆y;䐑ƀcrtąċĔause;戵noullis;愬a;䎒r;쀀\uD835\uDD05pf;쀀\uD835\uDD39eve;䋘còēmpeq;扎܀HOacdefhilorsuōőŖƀƞƢƵƷƺǜȕɳɸɾcy;䐧PY耻©䂩ƀcpyŝŢźute;䄆Ā;iŧŨ拒talDifferentialD;慅leys;愭ȀaeioƉƎƔƘron;䄌dil耻Ç䃇rc;䄈nint;戰ot;䄊ĀdnƧƭilla;䂸terDot;䂷òſi;䎧rcleȀDMPTǇǋǑǖot;抙inus;抖lus;投imes;抗oĀcsǢǸkwiseContourIntegral;戲eCurlyĀDQȃȏoubleQuote;思uote;怙ȀlnpuȞȨɇɕonĀ;eȥȦ户;橴ƀgitȯȶȺruent;扡nt;戯ourIntegral;戮ĀfrɌɎ;愂oduct;成nterClockwiseContourIntegral;戳oss;樯cr;쀀\uD835\uDC9EpĀ;Cʄʅ拓ap;才րDJSZacefiosʠʬʰʴʸˋ˗ˡ˦̳ҍĀ;oŹʥtrahd;椑cy;䐂cy;䐅cy;䐏ƀgrsʿ˄ˇger;怡r;憡hv;櫤Āayː˕ron;䄎;䐔lĀ;t˝˞戇a;䎔r;쀀\uD835\uDD07Āaf˫̧Ācm˰̢riticalȀADGT̖̜̀̆cute;䂴oŴ̋̍;䋙bleAcute;䋝rave;䁠ilde;䋜ond;拄ferentialD;慆Ѱ̽\x00\x00\x00͔͂\x00Ѕf;쀀\uD835\uDD3Bƀ;DE͈͉͍䂨ot;惜qual;扐blèCDLRUVͣͲ΂ϏϢϸontourIntegraìȹoɴ͹\x00\x00ͻ»͉nArrow;懓Āeo·ΤftƀARTΐΖΡrrow;懐ightArrow;懔eåˊngĀLRΫτeftĀARγιrrow;柸ightArrow;柺ightArrow;柹ightĀATϘϞrrow;懒ee;抨pɁϩ\x00\x00ϯrrow;懑ownArrow;懕erticalBar;戥ǹABLRTaВЪаўѿͼrrowƀ;BUНОТ憓ar;椓pArrow;懵reve;䌑eft˒к\x00ц\x00ѐightVector;楐eeVector;楞ectorĀ;Bљњ憽ar;楖ightǔѧ\x00ѱeeVector;楟ectorĀ;BѺѻ懁ar;楗eeĀ;A҆҇护rrow;憧ĀctҒҗr;쀀\uD835\uDC9Frok;䄐ࠀNTacdfglmopqstuxҽӀӄӋӞӢӧӮӵԡԯԶՒ՝ՠեG;䅊H耻Ð䃐cute耻É䃉ƀaiyӒӗӜron;䄚rc耻Ê䃊;䐭ot;䄖r;쀀\uD835\uDD08rave耻È䃈ement;戈ĀapӺӾcr;䄒tyɓԆ\x00\x00ԒmallSquare;旻erySmallSquare;斫ĀgpԦԪon;䄘f;쀀\uD835\uDD3Csilon;䎕uĀaiԼՉlĀ;TՂՃ橵ilde;扂librium;懌Āci՗՚r;愰m;橳a;䎗ml耻Ë䃋Āipժկsts;戃onentialE;慇ʀcfiosօֈ֍ֲ׌y;䐤r;쀀\uD835\uDD09lledɓ֗\x00\x00֣mallSquare;旼erySmallSquare;斪Ͱֺ\x00ֿ\x00\x00ׄf;쀀\uD835\uDD3DAll;戀riertrf;愱cò׋؀JTabcdfgorstר׬ׯ׺؀ؒؖ؛؝أ٬ٲcy;䐃耻>䀾mmaĀ;d׷׸䎓;䏜reve;䄞ƀeiy؇،ؐdil;䄢rc;䄜;䐓ot;䄠r;쀀\uD835\uDD0A;拙pf;쀀\uD835\uDD3Eeater̀EFGLSTصلَٖٛ٦qualĀ;Lؾؿ扥ess;招ullEqual;执reater;檢ess;扷lantEqual;橾ilde;扳cr;쀀\uD835\uDCA2;扫ЀAacfiosuڅڋږڛڞڪھۊRDcy;䐪Āctڐڔek;䋇;䁞irc;䄤r;愌lbertSpace;愋ǰگ\x00ڲf;愍izontalLine;攀Āctۃۅòکrok;䄦mpńېۘownHumðįqual;扏܀EJOacdfgmnostuۺ۾܃܇܎ܚܞܡܨ݄ݸދޏޕcy;䐕lig;䄲cy;䐁cute耻Í䃍Āiyܓܘrc耻Î䃎;䐘ot;䄰r;愑rave耻Ì䃌ƀ;apܠܯܿĀcgܴܷr;䄪inaryI;慈lieóϝǴ݉\x00ݢĀ;eݍݎ戬Āgrݓݘral;戫section;拂isibleĀCTݬݲomma;恣imes;恢ƀgptݿރވon;䄮f;쀀\uD835\uDD40a;䎙cr;愐ilde;䄨ǫޚ\x00ޞcy;䐆l耻Ï䃏ʀcfosuެ޷޼߂ߐĀiyޱ޵rc;䄴;䐙r;쀀\uD835\uDD0Dpf;쀀\uD835\uDD41ǣ߇\x00ߌr;쀀\uD835\uDCA5rcy;䐈kcy;䐄΀HJacfosߤߨ߽߬߱ࠂࠈcy;䐥cy;䐌ppa;䎚Āey߶߻dil;䄶;䐚r;쀀\uD835\uDD0Epf;쀀\uD835\uDD42cr;쀀\uD835\uDCA6րJTaceflmostࠥࠩࠬࡐࡣ঳সে্਷ੇcy;䐉耻<䀼ʀcmnpr࠷࠼ࡁࡄࡍute;䄹bda;䎛g;柪lacetrf;愒r;憞ƀaeyࡗ࡜ࡡron;䄽dil;䄻;䐛Āfsࡨ॰tԀACDFRTUVarࡾࢩࢱࣦ࣠ࣼयज़ΐ४Ānrࢃ࢏gleBracket;柨rowƀ;BR࢙࢚࢞憐ar;懤ightArrow;懆eiling;挈oǵࢷ\x00ࣃbleBracket;柦nǔࣈ\x00࣒eeVector;楡ectorĀ;Bࣛࣜ懃ar;楙loor;挊ightĀAV࣯ࣵrrow;憔ector;楎Āerँगeƀ;AVउऊऐ抣rrow;憤ector;楚iangleƀ;BEतथऩ抲ar;槏qual;抴pƀDTVषूौownVector;楑eeVector;楠ectorĀ;Bॖॗ憿ar;楘ectorĀ;B॥०憼ar;楒ightáΜs̀EFGLSTॾঋকঝঢভqualGreater;拚ullEqual;扦reater;扶ess;檡lantEqual;橽ilde;扲r;쀀\uD835\uDD0FĀ;eঽা拘ftarrow;懚idot;䄿ƀnpw৔ਖਛgȀLRlr৞৷ਂਐeftĀAR০৬rrow;柵ightArrow;柷ightArrow;柶eftĀarγਊightáοightáϊf;쀀\uD835\uDD43erĀLRਢਬeftArrow;憙ightArrow;憘ƀchtਾੀੂòࡌ;憰rok;䅁;扪Ѐacefiosuਗ਼੝੠੷੼અઋ઎p;椅y;䐜Ādl੥੯iumSpace;恟lintrf;愳r;쀀\uD835\uDD10nusPlus;戓pf;쀀\uD835\uDD44cò੶;䎜ҀJacefostuણધભીଔଙඑ඗ඞcy;䐊cute;䅃ƀaey઴હાron;䅇dil;䅅;䐝ƀgswે૰଎ativeƀMTV૓૟૨ediumSpace;怋hiĀcn૦૘ë૙eryThiî૙tedĀGL૸ଆreaterGreateòٳessLesóੈLine;䀊r;쀀\uD835\uDD11ȀBnptଢନଷ଺reak;恠BreakingSpace;䂠f;愕ڀ;CDEGHLNPRSTV୕ୖ୪୼஡௫ఄ౞಄ದ೘ൡඅ櫬Āou୛୤ngruent;扢pCap;扭oubleVerticalBar;戦ƀlqxஃஊ஛ement;戉ualĀ;Tஒஓ扠ilde;쀀≂̸ists;戄reater΀;EFGLSTஶஷ஽௉௓௘௥扯qual;扱ullEqual;쀀≧̸reater;쀀≫̸ess;批lantEqual;쀀⩾̸ilde;扵umpń௲௽ownHump;쀀≎̸qual;쀀≏̸eĀfsఊధtTriangleƀ;BEచఛడ拪ar;쀀⧏̸qual;括s̀;EGLSTవశ఼ౄోౘ扮qual;扰reater;扸ess;쀀≪̸lantEqual;쀀⩽̸ilde;扴estedĀGL౨౹reaterGreater;쀀⪢̸essLess;쀀⪡̸recedesƀ;ESಒಓಛ技qual;쀀⪯̸lantEqual;拠ĀeiಫಹverseElement;戌ghtTriangleƀ;BEೋೌ೒拫ar;쀀⧐̸qual;拭ĀquೝഌuareSuĀbp೨೹setĀ;E೰ೳ쀀⊏̸qual;拢ersetĀ;Eഃആ쀀⊐̸qual;拣ƀbcpഓതൎsetĀ;Eഛഞ쀀⊂⃒qual;抈ceedsȀ;ESTലള഻െ抁qual;쀀⪰̸lantEqual;拡ilde;쀀≿̸ersetĀ;E൘൛쀀⊃⃒qual;抉ildeȀ;EFT൮൯൵ൿ扁qual;扄ullEqual;扇ilde;扉erticalBar;戤cr;쀀\uD835\uDCA9ilde耻Ñ䃑;䎝܀Eacdfgmoprstuvලෂ෉෕ෛ෠෧෼ขภยา฿ไlig;䅒cute耻Ó䃓Āiy෎ීrc耻Ô䃔;䐞blac;䅐r;쀀\uD835\uDD12rave耻Ò䃒ƀaei෮ෲ෶cr;䅌ga;䎩cron;䎟pf;쀀\uD835\uDD46enCurlyĀDQฎบoubleQuote;怜uote;怘;橔Āclวฬr;쀀\uD835\uDCAAash耻Ø䃘iŬื฼de耻Õ䃕es;樷ml耻Ö䃖erĀBP๋๠Āar๐๓r;怾acĀek๚๜;揞et;掴arenthesis;揜Ҁacfhilors๿ງຊຏຒດຝະ໼rtialD;戂y;䐟r;쀀\uD835\uDD13i;䎦;䎠usMinus;䂱Āipຢອncareplanåڝf;愙Ȁ;eio຺ູ໠໤檻cedesȀ;EST່້໏໚扺qual;檯lantEqual;扼ilde;找me;怳Ādp໩໮uct;戏ortionĀ;aȥ໹l;戝Āci༁༆r;쀀\uD835\uDCAB;䎨ȀUfos༑༖༛༟OT耻\"䀢r;쀀\uD835\uDD14pf;愚cr;쀀\uD835\uDCAC؀BEacefhiorsu༾གྷཇའཱིྦྷྪྭ႖ႩႴႾarr;椐G耻®䂮ƀcnrཎནབute;䅔g;柫rĀ;tཛྷཝ憠l;椖ƀaeyཧཬཱron;䅘dil;䅖;䐠Ā;vླྀཹ愜erseĀEUྂྙĀlq྇ྎement;戋uilibrium;懋pEquilibrium;楯r»ཹo;䎡ghtЀACDFTUVa࿁࿫࿳ဢဨၛႇϘĀnr࿆࿒gleBracket;柩rowƀ;BL࿜࿝࿡憒ar;懥eftArrow;懄eiling;按oǵ࿹\x00စbleBracket;柧nǔည\x00နeeVector;楝ectorĀ;Bဝသ懂ar;楕loor;挋Āerိ၃eƀ;AVဵံြ抢rrow;憦ector;楛iangleƀ;BEၐၑၕ抳ar;槐qual;抵pƀDTVၣၮၸownVector;楏eeVector;楜ectorĀ;Bႂႃ憾ar;楔ectorĀ;B႑႒懀ar;楓Āpuႛ႞f;愝ndImplies;楰ightarrow;懛ĀchႹႼr;愛;憱leDelayed;槴ڀHOacfhimoqstuფჱჷჽᄙᄞᅑᅖᅡᅧᆵᆻᆿĀCcჩხHcy;䐩y;䐨FTcy;䐬cute;䅚ʀ;aeiyᄈᄉᄎᄓᄗ檼ron;䅠dil;䅞rc;䅜;䐡r;쀀\uD835\uDD16ortȀDLRUᄪᄴᄾᅉownArrow»ОeftArrow»࢚ightArrow»࿝pArrow;憑gma;䎣allCircle;战pf;쀀\uD835\uDD4Aɲᅭ\x00\x00ᅰt;戚areȀ;ISUᅻᅼᆉᆯ斡ntersection;抓uĀbpᆏᆞsetĀ;Eᆗᆘ抏qual;抑ersetĀ;Eᆨᆩ抐qual;抒nion;抔cr;쀀\uD835\uDCAEar;拆ȀbcmpᇈᇛሉላĀ;sᇍᇎ拐etĀ;Eᇍᇕqual;抆ĀchᇠህeedsȀ;ESTᇭᇮᇴᇿ扻qual;檰lantEqual;扽ilde;承Tháྌ;我ƀ;esሒሓሣ拑rsetĀ;Eሜም抃qual;抇et»ሓրHRSacfhiorsሾቄ቉ቕ቞ቱቶኟዂወዑORN耻Þ䃞ADE;愢ĀHc቎ቒcy;䐋y;䐦Ābuቚቜ;䀉;䎤ƀaeyብቪቯron;䅤dil;䅢;䐢r;쀀\uD835\uDD17Āeiቻ኉ǲኀ\x00ኇefore;戴a;䎘Ācn኎ኘkSpace;쀀  Space;怉ldeȀ;EFTካኬኲኼ戼qual;扃ullEqual;扅ilde;扈pf;쀀\uD835\uDD4BipleDot;惛Āctዖዛr;쀀\uD835\uDCAFrok;䅦ૡዷጎጚጦ\x00ጬጱ\x00\x00\x00\x00\x00ጸጽ፷ᎅ\x00᏿ᐄᐊᐐĀcrዻጁute耻Ú䃚rĀ;oጇገ憟cir;楉rǣጓ\x00጖y;䐎ve;䅬Āiyጞጣrc耻Û䃛;䐣blac;䅰r;쀀\uD835\uDD18rave耻Ù䃙acr;䅪Ādiፁ፩erĀBPፈ፝Āarፍፐr;䁟acĀekፗፙ;揟et;掵arenthesis;揝onĀ;P፰፱拃lus;抎Āgp፻፿on;䅲f;쀀\uD835\uDD4CЀADETadps᎕ᎮᎸᏄϨᏒᏗᏳrrowƀ;BDᅐᎠᎤar;椒ownArrow;懅ownArrow;憕quilibrium;楮eeĀ;AᏋᏌ报rrow;憥ownáϳerĀLRᏞᏨeftArrow;憖ightArrow;憗iĀ;lᏹᏺ䏒on;䎥ing;䅮cr;쀀\uD835\uDCB0ilde;䅨ml耻Ü䃜ҀDbcdefosvᐧᐬᐰᐳᐾᒅᒊᒐᒖash;披ar;櫫y;䐒ashĀ;lᐻᐼ抩;櫦Āerᑃᑅ;拁ƀbtyᑌᑐᑺar;怖Ā;iᑏᑕcalȀBLSTᑡᑥᑪᑴar;戣ine;䁼eparator;杘ilde;所ThinSpace;怊r;쀀\uD835\uDD19pf;쀀\uD835\uDD4Dcr;쀀\uD835\uDCB1dash;抪ʀcefosᒧᒬᒱᒶᒼirc;䅴dge;拀r;쀀\uD835\uDD1Apf;쀀\uD835\uDD4Ecr;쀀\uD835\uDCB2Ȁfiosᓋᓐᓒᓘr;쀀\uD835\uDD1B;䎞pf;쀀\uD835\uDD4Fcr;쀀\uD835\uDCB3ҀAIUacfosuᓱᓵᓹᓽᔄᔏᔔᔚᔠcy;䐯cy;䐇cy;䐮cute耻Ý䃝Āiyᔉᔍrc;䅶;䐫r;쀀\uD835\uDD1Cpf;쀀\uD835\uDD50cr;쀀\uD835\uDCB4ml;䅸ЀHacdefosᔵᔹᔿᕋᕏᕝᕠᕤcy;䐖cute;䅹Āayᕄᕉron;䅽;䐗ot;䅻ǲᕔ\x00ᕛoWidtè૙a;䎖r;愨pf;愤cr;쀀\uD835\uDCB5௡ᖃᖊᖐ\x00ᖰᖶᖿ\x00\x00\x00\x00ᗆᗛᗫᙟ᙭\x00ᚕ᚛ᚲᚹ\x00ᚾcute耻á䃡reve;䄃̀;Ediuyᖜᖝᖡᖣᖨᖭ戾;쀀∾̳;房rc耻â䃢te肻´̆;䐰lig耻æ䃦Ā;r²ᖺ;쀀\uD835\uDD1Erave耻à䃠ĀepᗊᗖĀfpᗏᗔsym;愵èᗓha;䎱ĀapᗟcĀclᗤᗧr;䄁g;樿ɤᗰ\x00\x00ᘊʀ;adsvᗺᗻᗿᘁᘇ戧nd;橕;橜lope;橘;橚΀;elmrszᘘᘙᘛᘞᘿᙏᙙ戠;榤e»ᘙsdĀ;aᘥᘦ戡ѡᘰᘲᘴᘶᘸᘺᘼᘾ;榨;榩;榪;榫;榬;榭;榮;榯tĀ;vᙅᙆ戟bĀ;dᙌᙍ抾;榝Āptᙔᙗh;戢»¹arr;捼Āgpᙣᙧon;䄅f;쀀\uD835\uDD52΀;Eaeiop዁ᙻᙽᚂᚄᚇᚊ;橰cir;橯;扊d;手s;䀧roxĀ;e዁ᚒñᚃing耻å䃥ƀctyᚡᚦᚨr;쀀\uD835\uDCB6;䀪mpĀ;e዁ᚯñʈilde耻ã䃣ml耻ä䃤Āciᛂᛈoninôɲnt;樑ࠀNabcdefiklnoprsu᛭ᛱᜰ᜼ᝃᝈ᝸᝽០៦ᠹᡐᜍ᤽᥈ᥰot;櫭Ācrᛶ᜞kȀcepsᜀᜅᜍᜓong;扌psilon;䏶rime;怵imĀ;e᜚᜛戽q;拍Ŷᜢᜦee;抽edĀ;gᜬᜭ挅e»ᜭrkĀ;t፜᜷brk;掶Āoyᜁᝁ;䐱quo;怞ʀcmprtᝓ᝛ᝡᝤᝨausĀ;eĊĉptyv;榰séᜌnoõēƀahwᝯ᝱ᝳ;䎲;愶een;扬r;쀀\uD835\uDD1Fg΀costuvwឍឝឳេ៕៛៞ƀaiuបពរðݠrc;旯p»፱ƀdptឤឨឭot;樀lus;樁imes;樂ɱឹ\x00\x00ើcup;樆ar;昅riangleĀdu៍្own;施p;斳plus;樄eåᑄåᒭarow;植ƀako៭ᠦᠵĀcn៲ᠣkƀlst៺֫᠂ozenge;槫riangleȀ;dlr᠒᠓᠘᠝斴own;斾eft;旂ight;斸k;搣Ʊᠫ\x00ᠳƲᠯ\x00ᠱ;斒;斑4;斓ck;斈ĀeoᠾᡍĀ;qᡃᡆ쀀=⃥uiv;쀀≡⃥t;挐Ȁptwxᡙᡞᡧᡬf;쀀\uD835\uDD53Ā;tᏋᡣom»Ꮜtie;拈؀DHUVbdhmptuvᢅᢖᢪᢻᣗᣛᣬ᣿ᤅᤊᤐᤡȀLRlrᢎᢐᢒᢔ;敗;敔;敖;敓ʀ;DUduᢡᢢᢤᢦᢨ敐;敦;敩;敤;敧ȀLRlrᢳᢵᢷᢹ;敝;敚;敜;教΀;HLRhlrᣊᣋᣍᣏᣑᣓᣕ救;敬;散;敠;敫;敢;敟ox;槉ȀLRlrᣤᣦᣨᣪ;敕;敒;攐;攌ʀ;DUduڽ᣷᣹᣻᣽;敥;敨;攬;攴inus;抟lus;択imes;抠ȀLRlrᤙᤛᤝ᤟;敛;敘;攘;攔΀;HLRhlrᤰᤱᤳᤵᤷ᤻᤹攂;敪;敡;敞;攼;攤;攜Āevģ᥂bar耻¦䂦Ȁceioᥑᥖᥚᥠr;쀀\uD835\uDCB7mi;恏mĀ;e᜚᜜lƀ;bhᥨᥩᥫ䁜;槅sub;柈Ŭᥴ᥾lĀ;e᥹᥺怢t»᥺pƀ;Eeįᦅᦇ;檮Ā;qۜۛೡᦧ\x00᧨ᨑᨕᨲ\x00ᨷᩐ\x00\x00᪴\x00\x00᫁\x00\x00ᬡᬮ᭍᭒\x00᯽\x00ᰌƀcpr᦭ᦲ᧝ute;䄇̀;abcdsᦿᧀᧄ᧊᧕᧙戩nd;橄rcup;橉Āau᧏᧒p;橋p;橇ot;橀;쀀∩︀Āeo᧢᧥t;恁îړȀaeiu᧰᧻ᨁᨅǰ᧵\x00᧸s;橍on;䄍dil耻ç䃧rc;䄉psĀ;sᨌᨍ橌m;橐ot;䄋ƀdmnᨛᨠᨦil肻¸ƭptyv;榲t脀¢;eᨭᨮ䂢räƲr;쀀\uD835\uDD20ƀceiᨽᩀᩍy;䑇ckĀ;mᩇᩈ朓ark»ᩈ;䏇r΀;Ecefms᩟᩠ᩢᩫ᪤᪪᪮旋;槃ƀ;elᩩᩪᩭ䋆q;扗eɡᩴ\x00\x00᪈rrowĀlr᩼᪁eft;憺ight;憻ʀRSacd᪒᪔᪖᪚᪟»ཇ;擈st;抛irc;抚ash;抝nint;樐id;櫯cir;槂ubsĀ;u᪻᪼晣it»᪼ˬ᫇᫔᫺\x00ᬊonĀ;eᫍᫎ䀺Ā;qÇÆɭ᫙\x00\x00᫢aĀ;t᫞᫟䀬;䁀ƀ;fl᫨᫩᫫戁îᅠeĀmx᫱᫶ent»᫩eóɍǧ᫾\x00ᬇĀ;dኻᬂot;橭nôɆƀfryᬐᬔᬗ;쀀\uD835\uDD54oäɔ脀©;sŕᬝr;愗Āaoᬥᬩrr;憵ss;朗Ācuᬲᬷr;쀀\uD835\uDCB8Ābpᬼ᭄Ā;eᭁᭂ櫏;櫑Ā;eᭉᭊ櫐;櫒dot;拯΀delprvw᭠᭬᭷ᮂᮬᯔ᯹arrĀlr᭨᭪;椸;椵ɰ᭲\x00\x00᭵r;拞c;拟arrĀ;p᭿ᮀ憶;椽̀;bcdosᮏᮐᮖᮡᮥᮨ截rcap;橈Āauᮛᮞp;橆p;橊ot;抍r;橅;쀀∪︀Ȁalrv᮵ᮿᯞᯣrrĀ;mᮼᮽ憷;椼yƀevwᯇᯔᯘqɰᯎ\x00\x00ᯒreã᭳uã᭵ee;拎edge;拏en耻¤䂤earrowĀlrᯮ᯳eft»ᮀight»ᮽeäᯝĀciᰁᰇoninôǷnt;戱lcty;挭ঀAHabcdefhijlorstuwz᰸᰻᰿ᱝᱩᱵᲊᲞᲬᲷ᳻᳿ᴍᵻᶑᶫᶻ᷆᷍rò΁ar;楥Ȁglrs᱈ᱍ᱒᱔ger;怠eth;愸òᄳhĀ;vᱚᱛ怐»ऊūᱡᱧarow;椏aã̕Āayᱮᱳron;䄏;䐴ƀ;ao̲ᱼᲄĀgrʿᲁr;懊tseq;橷ƀglmᲑᲔᲘ耻°䂰ta;䎴ptyv;榱ĀirᲣᲨsht;楿;쀀\uD835\uDD21arĀlrᲳᲵ»ࣜ»သʀaegsv᳂͸᳖᳜᳠mƀ;oș᳊᳔ndĀ;ș᳑uit;晦amma;䏝in;拲ƀ;io᳧᳨᳸䃷de脀÷;o᳧ᳰntimes;拇nø᳷cy;䑒cɯᴆ\x00\x00ᴊrn;挞op;挍ʀlptuwᴘᴝᴢᵉᵕlar;䀤f;쀀\uD835\uDD55ʀ;emps̋ᴭᴷᴽᵂqĀ;d͒ᴳot;扑inus;戸lus;戔quare;抡blebarwedgåúnƀadhᄮᵝᵧownarrowóᲃarpoonĀlrᵲᵶefôᲴighôᲶŢᵿᶅkaro÷གɯᶊ\x00\x00ᶎrn;挟op;挌ƀcotᶘᶣᶦĀryᶝᶡ;쀀\uD835\uDCB9;䑕l;槶rok;䄑Ādrᶰᶴot;拱iĀ;fᶺ᠖斿Āah᷀᷃ròЩaòྦangle;榦Āci᷒ᷕy;䑟grarr;柿ऀDacdefglmnopqrstuxḁḉḙḸոḼṉṡṾấắẽỡἪἷὄ὎὚ĀDoḆᴴoôᲉĀcsḎḔute耻é䃩ter;橮ȀaioyḢḧḱḶron;䄛rĀ;cḭḮ扖耻ê䃪lon;払;䑍ot;䄗ĀDrṁṅot;扒;쀀\uD835\uDD22ƀ;rsṐṑṗ檚ave耻è䃨Ā;dṜṝ檖ot;檘Ȁ;ilsṪṫṲṴ檙nters;揧;愓Ā;dṹṺ檕ot;檗ƀapsẅẉẗcr;䄓tyƀ;svẒẓẕ戅et»ẓpĀ1;ẝẤĳạả;怄;怅怃ĀgsẪẬ;䅋p;怂ĀgpẴẸon;䄙f;쀀\uD835\uDD56ƀalsỄỎỒrĀ;sỊị拕l;槣us;橱iƀ;lvỚớở䎵on»ớ;䏵ȀcsuvỪỳἋἣĀioữḱrc»Ḯɩỹ\x00\x00ỻíՈantĀglἂἆtr»ṝess»Ṻƀaeiἒ἖Ἒls;䀽st;扟vĀ;DȵἠD;橸parsl;槥ĀDaἯἳot;打rr;楱ƀcdiἾὁỸr;愯oô͒ĀahὉὋ;䎷耻ð䃰Āmrὓὗl耻ë䃫o;悬ƀcipὡὤὧl;䀡sôծĀeoὬὴctatioîՙnentialåչৡᾒ\x00ᾞ\x00ᾡᾧ\x00\x00ῆῌ\x00ΐ\x00ῦῪ \x00 ⁚llingdotseñṄy;䑄male;晀ƀilrᾭᾳ῁lig;耀ﬃɩᾹ\x00\x00᾽g;耀ﬀig;耀ﬄ;쀀\uD835\uDD23lig;耀ﬁlig;쀀fjƀaltῙ῜ῡt;晭ig;耀ﬂns;斱of;䆒ǰ΅\x00ῳf;쀀\uD835\uDD57ĀakֿῷĀ;vῼ´拔;櫙artint;樍Āao‌⁕Ācs‑⁒α‚‰‸⁅⁈\x00⁐β•‥‧‪‬\x00‮耻½䂽;慓耻¼䂼;慕;慙;慛Ƴ‴\x00‶;慔;慖ʴ‾⁁\x00\x00⁃耻¾䂾;慗;慜5;慘ƶ⁌\x00⁎;慚;慝8;慞l;恄wn;挢cr;쀀\uD835\uDCBBࢀEabcdefgijlnorstv₂₉₟₥₰₴⃰⃵⃺⃿℃ℒℸ̗ℾ⅒↞Ā;lٍ₇;檌ƀcmpₐₕ₝ute;䇵maĀ;dₜ᳚䎳;檆reve;䄟Āiy₪₮rc;䄝;䐳ot;䄡Ȁ;lqsؾق₽⃉ƀ;qsؾٌ⃄lanô٥Ȁ;cdl٥⃒⃥⃕c;檩otĀ;o⃜⃝檀Ā;l⃢⃣檂;檄Ā;e⃪⃭쀀⋛︀s;檔r;쀀\uD835\uDD24Ā;gٳ؛mel;愷cy;䑓Ȁ;Eajٚℌℎℐ;檒;檥;檤ȀEaesℛℝ℩ℴ;扩pĀ;p℣ℤ檊rox»ℤĀ;q℮ℯ檈Ā;q℮ℛim;拧pf;쀀\uD835\uDD58Āci⅃ⅆr;愊mƀ;el٫ⅎ⅐;檎;檐茀>;cdlqr׮ⅠⅪⅮⅳⅹĀciⅥⅧ;檧r;橺ot;拗Par;榕uest;橼ʀadelsↄⅪ←ٖ↛ǰ↉\x00↎proø₞r;楸qĀlqؿ↖lesó₈ií٫Āen↣↭rtneqq;쀀≩︀Å↪ԀAabcefkosy⇄⇇⇱⇵⇺∘∝∯≨≽ròΠȀilmr⇐⇔⇗⇛rsðᒄf»․ilôکĀdr⇠⇤cy;䑊ƀ;cwࣴ⇫⇯ir;楈;憭ar;意irc;䄥ƀalr∁∎∓rtsĀ;u∉∊晥it»∊lip;怦con;抹r;쀀\uD835\uDD25sĀew∣∩arow;椥arow;椦ʀamopr∺∾≃≞≣rr;懿tht;戻kĀlr≉≓eftarrow;憩ightarrow;憪f;쀀\uD835\uDD59bar;怕ƀclt≯≴≸r;쀀\uD835\uDCBDasè⇴rok;䄧Ābp⊂⊇ull;恃hen»ᱛૡ⊣\x00⊪\x00⊸⋅⋎\x00⋕⋳\x00\x00⋸⌢⍧⍢⍿\x00⎆⎪⎴cute耻í䃭ƀ;iyݱ⊰⊵rc耻î䃮;䐸Ācx⊼⊿y;䐵cl耻¡䂡ĀfrΟ⋉;쀀\uD835\uDD26rave耻ì䃬Ȁ;inoܾ⋝⋩⋮Āin⋢⋦nt;樌t;戭fin;槜ta;愩lig;䄳ƀaop⋾⌚⌝ƀcgt⌅⌈⌗r;䄫ƀelpܟ⌏⌓inåގarôܠh;䄱f;抷ed;䆵ʀ;cfotӴ⌬⌱⌽⍁are;愅inĀ;t⌸⌹戞ie;槝doô⌙ʀ;celpݗ⍌⍐⍛⍡al;抺Āgr⍕⍙eróᕣã⍍arhk;樗rod;樼Ȁcgpt⍯⍲⍶⍻y;䑑on;䄯f;쀀\uD835\uDD5Aa;䎹uest耻¿䂿Āci⎊⎏r;쀀\uD835\uDCBEnʀ;EdsvӴ⎛⎝⎡ӳ;拹ot;拵Ā;v⎦⎧拴;拳Ā;iݷ⎮lde;䄩ǫ⎸\x00⎼cy;䑖l耻ï䃯̀cfmosu⏌⏗⏜⏡⏧⏵Āiy⏑⏕rc;䄵;䐹r;쀀\uD835\uDD27ath;䈷pf;쀀\uD835\uDD5Bǣ⏬\x00⏱r;쀀\uD835\uDCBFrcy;䑘kcy;䑔Ѐacfghjos␋␖␢␧␭␱␵␻ppaĀ;v␓␔䎺;䏰Āey␛␠dil;䄷;䐺r;쀀\uD835\uDD28reen;䄸cy;䑅cy;䑜pf;쀀\uD835\uDD5Ccr;쀀\uD835\uDCC0஀ABEHabcdefghjlmnoprstuv⑰⒁⒆⒍⒑┎┽╚▀♎♞♥♹♽⚚⚲⛘❝❨➋⟀⠁⠒ƀart⑷⑺⑼rò৆òΕail;椛arr;椎Ā;gঔ⒋;檋ar;楢ॣ⒥\x00⒪\x00⒱\x00\x00\x00\x00\x00⒵Ⓔ\x00ⓆⓈⓍ\x00⓹ute;䄺mptyv;榴raîࡌbda;䎻gƀ;dlࢎⓁⓃ;榑åࢎ;檅uo耻«䂫rЀ;bfhlpst࢙ⓞⓦⓩ⓫⓮⓱⓵Ā;f࢝ⓣs;椟s;椝ë≒p;憫l;椹im;楳l;憢ƀ;ae⓿─┄檫il;椙Ā;s┉┊檭;쀀⪭︀ƀabr┕┙┝rr;椌rk;杲Āak┢┬cĀek┨┪;䁻;䁛Āes┱┳;榋lĀdu┹┻;榏;榍Ȁaeuy╆╋╖╘ron;䄾Ādi═╔il;䄼ìࢰâ┩;䐻Ȁcqrs╣╦╭╽a;椶uoĀ;rนᝆĀdu╲╷har;楧shar;楋h;憲ʀ;fgqs▋▌উ◳◿扤tʀahlrt▘▤▷◂◨rrowĀ;t࢙□aé⓶arpoonĀdu▯▴own»њp»०eftarrows;懇ightƀahs◍◖◞rrowĀ;sࣴࢧarpoonó྘quigarro÷⇰hreetimes;拋ƀ;qs▋ও◺lanôবʀ;cdgsব☊☍☝☨c;檨otĀ;o☔☕橿Ā;r☚☛檁;檃Ā;e☢☥쀀⋚︀s;檓ʀadegs☳☹☽♉♋pproøⓆot;拖qĀgq♃♅ôউgtò⒌ôছiíলƀilr♕࣡♚sht;楼;쀀\uD835\uDD29Ā;Eজ♣;檑š♩♶rĀdu▲♮Ā;l॥♳;楪lk;斄cy;䑙ʀ;achtੈ⚈⚋⚑⚖rò◁orneòᴈard;楫ri;旺Āio⚟⚤dot;䅀ustĀ;a⚬⚭掰che»⚭ȀEaes⚻⚽⛉⛔;扨pĀ;p⛃⛄檉rox»⛄Ā;q⛎⛏檇Ā;q⛎⚻im;拦Ѐabnoptwz⛩⛴⛷✚✯❁❇❐Ānr⛮⛱g;柬r;懽rëࣁgƀlmr⛿✍✔eftĀar০✇ightá৲apsto;柼ightá৽parrowĀlr✥✩efô⓭ight;憬ƀafl✶✹✽r;榅;쀀\uD835\uDD5Dus;樭imes;樴š❋❏st;戗áፎƀ;ef❗❘᠀旊nge»❘arĀ;l❤❥䀨t;榓ʀachmt❳❶❼➅➇ròࢨorneòᶌarĀ;d྘➃;業;怎ri;抿̀achiqt➘➝ੀ➢➮➻quo;怹r;쀀\uD835\uDCC1mƀ;egল➪➬;檍;檏Ābu┪➳oĀ;rฟ➹;怚rok;䅂萀<;cdhilqrࠫ⟒☹⟜⟠⟥⟪⟰Āci⟗⟙;檦r;橹reå◲mes;拉arr;楶uest;橻ĀPi⟵⟹ar;榖ƀ;ef⠀भ᠛旃rĀdu⠇⠍shar;楊har;楦Āen⠗⠡rtneqq;쀀≨︀Å⠞܀Dacdefhilnopsu⡀⡅⢂⢎⢓⢠⢥⢨⣚⣢⣤ઃ⣳⤂Dot;戺Ȁclpr⡎⡒⡣⡽r耻¯䂯Āet⡗⡙;時Ā;e⡞⡟朠se»⡟Ā;sျ⡨toȀ;dluျ⡳⡷⡻owîҌefôएðᏑker;斮Āoy⢇⢌mma;権;䐼ash;怔asuredangle»ᘦr;쀀\uD835\uDD2Ao;愧ƀcdn⢯⢴⣉ro耻µ䂵Ȁ;acdᑤ⢽⣀⣄sôᚧir;櫰ot肻·Ƶusƀ;bd⣒ᤃ⣓戒Ā;uᴼ⣘;横ţ⣞⣡p;櫛ò−ðઁĀdp⣩⣮els;抧f;쀀\uD835\uDD5EĀct⣸⣽r;쀀\uD835\uDCC2pos»ᖝƀ;lm⤉⤊⤍䎼timap;抸ఀGLRVabcdefghijlmoprstuvw⥂⥓⥾⦉⦘⧚⧩⨕⨚⩘⩝⪃⪕⪤⪨⬄⬇⭄⭿⮮ⰴⱧⱼ⳩Āgt⥇⥋;쀀⋙̸Ā;v⥐௏쀀≫⃒ƀelt⥚⥲⥶ftĀar⥡⥧rrow;懍ightarrow;懎;쀀⋘̸Ā;v⥻ే쀀≪⃒ightarrow;懏ĀDd⦎⦓ash;抯ash;抮ʀbcnpt⦣⦧⦬⦱⧌la»˞ute;䅄g;쀀∠⃒ʀ;Eiop඄⦼⧀⧅⧈;쀀⩰̸d;쀀≋̸s;䅉roø඄urĀ;a⧓⧔普lĀ;s⧓ସǳ⧟\x00⧣p肻 ଷmpĀ;e௹ఀʀaeouy⧴⧾⨃⨐⨓ǰ⧹\x00⧻;橃on;䅈dil;䅆ngĀ;dൾ⨊ot;쀀⩭̸p;橂;䐽ash;怓΀;Aadqsxஒ⨩⨭⨻⩁⩅⩐rr;懗rĀhr⨳⨶k;椤Ā;oᏲᏰot;쀀≐̸uiöୣĀei⩊⩎ar;椨í஘istĀ;s஠டr;쀀\uD835\uDD2BȀEest௅⩦⩹⩼ƀ;qs஼⩭௡ƀ;qs஼௅⩴lanô௢ií௪Ā;rஶ⪁»ஷƀAap⪊⪍⪑rò⥱rr;憮ar;櫲ƀ;svྍ⪜ྌĀ;d⪡⪢拼;拺cy;䑚΀AEadest⪷⪺⪾⫂⫅⫶⫹rò⥦;쀀≦̸rr;憚r;急Ȁ;fqs఻⫎⫣⫯tĀar⫔⫙rro÷⫁ightarro÷⪐ƀ;qs఻⪺⫪lanôౕĀ;sౕ⫴»శiíౝĀ;rవ⫾iĀ;eచథiäඐĀpt⬌⬑f;쀀\uD835\uDD5F膀¬;in⬙⬚⬶䂬nȀ;Edvஉ⬤⬨⬮;쀀⋹̸ot;쀀⋵̸ǡஉ⬳⬵;拷;拶iĀ;vಸ⬼ǡಸ⭁⭃;拾;拽ƀaor⭋⭣⭩rȀ;ast୻⭕⭚⭟lleì୻l;쀀⫽⃥;쀀∂̸lint;樔ƀ;ceಒ⭰⭳uåಥĀ;cಘ⭸Ā;eಒ⭽ñಘȀAait⮈⮋⮝⮧rò⦈rrƀ;cw⮔⮕⮙憛;쀀⤳̸;쀀↝̸ghtarrow»⮕riĀ;eೋೖ΀chimpqu⮽⯍⯙⬄୸⯤⯯Ȁ;cerല⯆ഷ⯉uå൅;쀀\uD835\uDCC3ortɭ⬅\x00\x00⯖ará⭖mĀ;e൮⯟Ā;q൴൳suĀbp⯫⯭å೸åഋƀbcp⯶ⰑⰙȀ;Ees⯿ⰀഢⰄ抄;쀀⫅̸etĀ;eഛⰋqĀ;qണⰀcĀ;eലⰗñസȀ;EesⰢⰣൟⰧ抅;쀀⫆̸etĀ;e൘ⰮqĀ;qൠⰣȀgilrⰽⰿⱅⱇìௗlde耻ñ䃱çృiangleĀlrⱒⱜeftĀ;eచⱚñదightĀ;eೋⱥñ೗Ā;mⱬⱭ䎽ƀ;esⱴⱵⱹ䀣ro;愖p;怇ҀDHadgilrsⲏⲔⲙⲞⲣⲰⲶⳓⳣash;抭arr;椄p;쀀≍⃒ash;抬ĀetⲨⲬ;쀀≥⃒;쀀>⃒nfin;槞ƀAetⲽⳁⳅrr;椂;쀀≤⃒Ā;rⳊⳍ쀀<⃒ie;쀀⊴⃒ĀAtⳘⳜrr;椃rie;쀀⊵⃒im;쀀∼⃒ƀAan⳰⳴ⴂrr;懖rĀhr⳺⳽k;椣Ā;oᏧᏥear;椧ቓ᪕\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00ⴭ\x00ⴸⵈⵠⵥ⵲ⶄᬇ\x00\x00ⶍⶫ\x00ⷈⷎ\x00ⷜ⸙⸫⸾⹃Ācsⴱ᪗ute耻ó䃳ĀiyⴼⵅrĀ;c᪞ⵂ耻ô䃴;䐾ʀabios᪠ⵒⵗǈⵚlac;䅑v;樸old;榼lig;䅓Ācr⵩⵭ir;榿;쀀\uD835\uDD2Cͯ⵹\x00\x00⵼\x00ⶂn;䋛ave耻ò䃲;槁Ābmⶈ෴ar;榵Ȁacitⶕ⶘ⶥⶨrò᪀Āir⶝ⶠr;榾oss;榻nå๒;槀ƀaeiⶱⶵⶹcr;䅍ga;䏉ƀcdnⷀⷅǍron;䎿;榶pf;쀀\uD835\uDD60ƀaelⷔ⷗ǒr;榷rp;榹΀;adiosvⷪⷫⷮ⸈⸍⸐⸖戨rò᪆Ȁ;efmⷷⷸ⸂⸅橝rĀ;oⷾⷿ愴f»ⷿ耻ª䂪耻º䂺gof;抶r;橖lope;橗;橛ƀclo⸟⸡⸧ò⸁ash耻ø䃸l;折iŬⸯ⸴de耻õ䃵esĀ;aǛ⸺s;樶ml耻ö䃶bar;挽ૡ⹞\x00⹽\x00⺀⺝\x00⺢⺹\x00\x00⻋ຜ\x00⼓\x00\x00⼫⾼\x00⿈rȀ;astЃ⹧⹲຅脀¶;l⹭⹮䂶leìЃɩ⹸\x00\x00⹻m;櫳;櫽y;䐿rʀcimpt⺋⺏⺓ᡥ⺗nt;䀥od;䀮il;怰enk;怱r;쀀\uD835\uDD2Dƀimo⺨⺰⺴Ā;v⺭⺮䏆;䏕maô੶ne;明ƀ;tv⺿⻀⻈䏀chfork»´;䏖Āau⻏⻟nĀck⻕⻝kĀ;h⇴⻛;愎ö⇴sҀ;abcdemst⻳⻴ᤈ⻹⻽⼄⼆⼊⼎䀫cir;樣ir;樢Āouᵀ⼂;樥;橲n肻±ຝim;樦wo;樧ƀipu⼙⼠⼥ntint;樕f;쀀\uD835\uDD61nd耻£䂣Ԁ;Eaceinosu່⼿⽁⽄⽇⾁⾉⾒⽾⾶;檳p;檷uå໙Ā;c໎⽌̀;acens່⽙⽟⽦⽨⽾pproø⽃urlyeñ໙ñ໎ƀaes⽯⽶⽺pprox;檹qq;檵im;拨iíໟmeĀ;s⾈ຮ怲ƀEas⽸⾐⽺ð⽵ƀdfp໬⾙⾯ƀals⾠⾥⾪lar;挮ine;挒urf;挓Ā;t໻⾴ï໻rel;抰Āci⿀⿅r;쀀\uD835\uDCC5;䏈ncsp;怈̀fiopsu⿚⋢⿟⿥⿫⿱r;쀀\uD835\uDD2Epf;쀀\uD835\uDD62rime;恗cr;쀀\uD835\uDCC6ƀaeo⿸〉〓tĀei⿾々rnionóڰnt;樖stĀ;e【】䀿ñἙô༔઀ABHabcdefhilmnoprstux぀けさすムㄎㄫㅇㅢㅲㆎ㈆㈕㈤㈩㉘㉮㉲㊐㊰㊷ƀartぇおがròႳòϝail;検aròᱥar;楤΀cdenqrtとふへみわゔヌĀeuねぱ;쀀∽̱te;䅕iãᅮmptyv;榳gȀ;del࿑らるろ;榒;榥å࿑uo耻»䂻rր;abcfhlpstw࿜ガクシスゼゾダッデナp;極Ā;f࿠ゴs;椠;椳s;椞ë≝ð✮l;楅im;楴l;憣;憝Āaiパフil;椚oĀ;nホボ戶aló༞ƀabrョリヮrò៥rk;杳ĀakンヽcĀekヹ・;䁽;䁝Āes㄂㄄;榌lĀduㄊㄌ;榎;榐Ȁaeuyㄗㄜㄧㄩron;䅙Ādiㄡㄥil;䅗ì࿲âヺ;䑀Ȁclqsㄴㄷㄽㅄa;椷dhar;楩uoĀ;rȎȍh;憳ƀacgㅎㅟངlȀ;ipsླྀㅘㅛႜnåႻarôྩt;断ƀilrㅩဣㅮsht;楽;쀀\uD835\uDD2FĀaoㅷㆆrĀduㅽㅿ»ѻĀ;l႑ㆄ;楬Ā;vㆋㆌ䏁;䏱ƀgns㆕ㇹㇼht̀ahlrstㆤㆰ㇂㇘㇤㇮rrowĀ;t࿜ㆭaéトarpoonĀduㆻㆿowîㅾp»႒eftĀah㇊㇐rrowó࿪arpoonóՑightarrows;應quigarro÷ニhreetimes;拌g;䋚ingdotseñἲƀahm㈍㈐㈓rò࿪aòՑ;怏oustĀ;a㈞㈟掱che»㈟mid;櫮Ȁabpt㈲㈽㉀㉒Ānr㈷㈺g;柭r;懾rëဃƀafl㉇㉊㉎r;榆;쀀\uD835\uDD63us;樮imes;樵Āap㉝㉧rĀ;g㉣㉤䀩t;榔olint;樒arò㇣Ȁachq㉻㊀Ⴜ㊅quo;怺r;쀀\uD835\uDCC7Ābu・㊊oĀ;rȔȓƀhir㊗㊛㊠reåㇸmes;拊iȀ;efl㊪ၙᠡ㊫方tri;槎luhar;楨;愞ൡ㋕㋛㋟㌬㌸㍱\x00㍺㎤\x00\x00㏬㏰\x00㐨㑈㑚㒭㒱㓊㓱\x00㘖\x00\x00㘳cute;䅛quï➺Ԁ;Eaceinpsyᇭ㋳㋵㋿㌂㌋㌏㌟㌦㌩;檴ǰ㋺\x00㋼;檸on;䅡uåᇾĀ;dᇳ㌇il;䅟rc;䅝ƀEas㌖㌘㌛;檶p;檺im;择olint;樓iíሄ;䑁otƀ;be㌴ᵇ㌵担;橦΀Aacmstx㍆㍊㍗㍛㍞㍣㍭rr;懘rĀhr㍐㍒ë∨Ā;oਸ਼਴t耻§䂧i;䀻war;椩mĀin㍩ðnuóñt;朶rĀ;o㍶⁕쀀\uD835\uDD30Ȁacoy㎂㎆㎑㎠rp;景Āhy㎋㎏cy;䑉;䑈rtɭ㎙\x00\x00㎜iäᑤaraì⹯耻­䂭Āgm㎨㎴maƀ;fv㎱㎲㎲䏃;䏂Ѐ;deglnprካ㏅㏉㏎㏖㏞㏡㏦ot;橪Ā;q኱ኰĀ;E㏓㏔檞;檠Ā;E㏛㏜檝;檟e;扆lus;樤arr;楲aròᄽȀaeit㏸㐈㐏㐗Āls㏽㐄lsetmé㍪hp;樳parsl;槤Ādlᑣ㐔e;挣Ā;e㐜㐝檪Ā;s㐢㐣檬;쀀⪬︀ƀflp㐮㐳㑂tcy;䑌Ā;b㐸㐹䀯Ā;a㐾㐿槄r;挿f;쀀\uD835\uDD64aĀdr㑍ЂesĀ;u㑔㑕晠it»㑕ƀcsu㑠㑹㒟Āau㑥㑯pĀ;sᆈ㑫;쀀⊓︀pĀ;sᆴ㑵;쀀⊔︀uĀbp㑿㒏ƀ;esᆗᆜ㒆etĀ;eᆗ㒍ñᆝƀ;esᆨᆭ㒖etĀ;eᆨ㒝ñᆮƀ;afᅻ㒦ְrť㒫ֱ»ᅼaròᅈȀcemt㒹㒾㓂㓅r;쀀\uD835\uDCC8tmîñiì㐕aræᆾĀar㓎㓕rĀ;f㓔ឿ昆Āan㓚㓭ightĀep㓣㓪psiloîỠhé⺯s»⡒ʀbcmnp㓻㕞ሉ㖋㖎Ҁ;Edemnprs㔎㔏㔑㔕㔞㔣㔬㔱㔶抂;櫅ot;檽Ā;dᇚ㔚ot;櫃ult;櫁ĀEe㔨㔪;櫋;把lus;檿arr;楹ƀeiu㔽㕒㕕tƀ;en㔎㕅㕋qĀ;qᇚ㔏eqĀ;q㔫㔨m;櫇Ābp㕚㕜;櫕;櫓c̀;acensᇭ㕬㕲㕹㕻㌦pproø㋺urlyeñᇾñᇳƀaes㖂㖈㌛pproø㌚qñ㌗g;晪ڀ123;Edehlmnps㖩㖬㖯ሜ㖲㖴㗀㗉㗕㗚㗟㗨㗭耻¹䂹耻²䂲耻³䂳;櫆Āos㖹㖼t;檾ub;櫘Ā;dሢ㗅ot;櫄sĀou㗏㗒l;柉b;櫗arr;楻ult;櫂ĀEe㗤㗦;櫌;抋lus;櫀ƀeiu㗴㘉㘌tƀ;enሜ㗼㘂qĀ;qሢ㖲eqĀ;q㗧㗤m;櫈Ābp㘑㘓;櫔;櫖ƀAan㘜㘠㘭rr;懙rĀhr㘦㘨ë∮Ā;oਫ਩war;椪lig耻ß䃟௡㙑㙝㙠ዎ㙳㙹\x00㙾㛂\x00\x00\x00\x00\x00㛛㜃\x00㜉㝬\x00\x00\x00㞇ɲ㙖\x00\x00㙛get;挖;䏄rë๟ƀaey㙦㙫㙰ron;䅥dil;䅣;䑂lrec;挕r;쀀\uD835\uDD31Ȁeiko㚆㚝㚵㚼ǲ㚋\x00㚑eĀ4fኄኁaƀ;sv㚘㚙㚛䎸ym;䏑Ācn㚢㚲kĀas㚨㚮pproø዁im»ኬsðኞĀas㚺㚮ð዁rn耻þ䃾Ǭ̟㛆⋧es膀×;bd㛏㛐㛘䃗Ā;aᤏ㛕r;樱;樰ƀeps㛡㛣㜀á⩍Ȁ;bcf҆㛬㛰㛴ot;挶ir;櫱Ā;o㛹㛼쀀\uD835\uDD65rk;櫚á㍢rime;怴ƀaip㜏㜒㝤dåቈ΀adempst㜡㝍㝀㝑㝗㝜㝟ngleʀ;dlqr㜰㜱㜶㝀㝂斵own»ᶻeftĀ;e⠀㜾ñम;扜ightĀ;e㊪㝋ñၚot;旬inus;樺lus;樹b;槍ime;樻ezium;揢ƀcht㝲㝽㞁Āry㝷㝻;쀀\uD835\uDCC9;䑆cy;䑛rok;䅧Āio㞋㞎xô᝷headĀlr㞗㞠eftarro÷ࡏightarrow»ཝऀAHabcdfghlmoprstuw㟐㟓㟗㟤㟰㟼㠎㠜㠣㠴㡑㡝㡫㢩㣌㣒㣪㣶ròϭar;楣Ācr㟜㟢ute耻ú䃺òᅐrǣ㟪\x00㟭y;䑞ve;䅭Āiy㟵㟺rc耻û䃻;䑃ƀabh㠃㠆㠋ròᎭlac;䅱aòᏃĀir㠓㠘sht;楾;쀀\uD835\uDD32rave耻ù䃹š㠧㠱rĀlr㠬㠮»ॗ»ႃlk;斀Āct㠹㡍ɯ㠿\x00\x00㡊rnĀ;e㡅㡆挜r»㡆op;挏ri;旸Āal㡖㡚cr;䅫肻¨͉Āgp㡢㡦on;䅳f;쀀\uD835\uDD66̀adhlsuᅋ㡸㡽፲㢑㢠ownáᎳarpoonĀlr㢈㢌efô㠭ighô㠯iƀ;hl㢙㢚㢜䏅»ᏺon»㢚parrows;懈ƀcit㢰㣄㣈ɯ㢶\x00\x00㣁rnĀ;e㢼㢽挝r»㢽op;挎ng;䅯ri;旹cr;쀀\uD835\uDCCAƀdir㣙㣝㣢ot;拰lde;䅩iĀ;f㜰㣨»᠓Āam㣯㣲rò㢨l耻ü䃼angle;榧ހABDacdeflnoprsz㤜㤟㤩㤭㦵㦸㦽㧟㧤㧨㧳㧹㧽㨁㨠ròϷarĀ;v㤦㤧櫨;櫩asèϡĀnr㤲㤷grt;榜΀eknprst㓣㥆㥋㥒㥝㥤㦖appá␕othinçẖƀhir㓫⻈㥙opô⾵Ā;hᎷ㥢ïㆍĀiu㥩㥭gmá㎳Ābp㥲㦄setneqĀ;q㥽㦀쀀⊊︀;쀀⫋︀setneqĀ;q㦏㦒쀀⊋︀;쀀⫌︀Āhr㦛㦟etá㚜iangleĀlr㦪㦯eft»थight»ၑy;䐲ash»ံƀelr㧄㧒㧗ƀ;beⷪ㧋㧏ar;抻q;扚lip;拮Ābt㧜ᑨaòᑩr;쀀\uD835\uDD33tré㦮suĀbp㧯㧱»ജ»൙pf;쀀\uD835\uDD67roð໻tré㦴Ācu㨆㨋r;쀀\uD835\uDCCBĀbp㨐㨘nĀEe㦀㨖»㥾nĀEe㦒㨞»㦐igzag;榚΀cefoprs㨶㨻㩖㩛㩔㩡㩪irc;䅵Ādi㩀㩑Ābg㩅㩉ar;機eĀ;qᗺ㩏;扙erp;愘r;쀀\uD835\uDD34pf;쀀\uD835\uDD68Ā;eᑹ㩦atèᑹcr;쀀\uD835\uDCCCૣណ㪇\x00㪋\x00㪐㪛\x00\x00㪝㪨㪫㪯\x00\x00㫃㫎\x00㫘ៜ៟tré៑r;쀀\uD835\uDD35ĀAa㪔㪗ròσrò৶;䎾ĀAa㪡㪤ròθrò৫að✓is;拻ƀdptឤ㪵㪾Āfl㪺ឩ;쀀\uD835\uDD69imåឲĀAa㫇㫊ròώròਁĀcq㫒ីr;쀀\uD835\uDCCDĀpt៖㫜ré។Ѐacefiosu㫰㫽㬈㬌㬑㬕㬛㬡cĀuy㫶㫻te耻ý䃽;䑏Āiy㬂㬆rc;䅷;䑋n耻¥䂥r;쀀\uD835\uDD36cy;䑗pf;쀀\uD835\uDD6Acr;쀀\uD835\uDCCEĀcm㬦㬩y;䑎l耻ÿ䃿Ԁacdefhiosw㭂㭈㭔㭘㭤㭩㭭㭴㭺㮀cute;䅺Āay㭍㭒ron;䅾;䐷ot;䅼Āet㭝㭡træᕟa;䎶r;쀀\uD835\uDD37cy;䐶grarr;懝pf;쀀\uD835\uDD6Bcr;쀀\uD835\uDCCFĀjn㮅㮇;怍j;怌".split("").map((c) => c.charCodeAt(0)));

// ../../node_modules/.pnpm/entities@4.5.0/node_modules/entities/lib/esm/generated/decode-data-xml.js
var decode_data_xml_default = new Uint16Array("Ȁaglq\t\x15\x18\x1Bɭ\x0F\x00\x00\x12p;䀦os;䀧t;䀾t;䀼uot;䀢".split("").map((c) => c.charCodeAt(0)));

// ../../node_modules/.pnpm/entities@4.5.0/node_modules/entities/lib/esm/decode_codepoint.js
var _a;
var decodeMap = new Map([
  [0, 65533],
  [128, 8364],
  [130, 8218],
  [131, 402],
  [132, 8222],
  [133, 8230],
  [134, 8224],
  [135, 8225],
  [136, 710],
  [137, 8240],
  [138, 352],
  [139, 8249],
  [140, 338],
  [142, 381],
  [145, 8216],
  [146, 8217],
  [147, 8220],
  [148, 8221],
  [149, 8226],
  [150, 8211],
  [151, 8212],
  [152, 732],
  [153, 8482],
  [154, 353],
  [155, 8250],
  [156, 339],
  [158, 382],
  [159, 376]
]);
var fromCodePoint = (_a = String.fromCodePoint) !== null && _a !== undefined ? _a : function(codePoint) {
  let output = "";
  if (codePoint > 65535) {
    codePoint -= 65536;
    output += String.fromCharCode(codePoint >>> 10 & 1023 | 55296);
    codePoint = 56320 | codePoint & 1023;
  }
  output += String.fromCharCode(codePoint);
  return output;
};
function replaceCodePoint(codePoint) {
  var _a2;
  if (codePoint >= 55296 && codePoint <= 57343 || codePoint > 1114111) {
    return 65533;
  }
  return (_a2 = decodeMap.get(codePoint)) !== null && _a2 !== undefined ? _a2 : codePoint;
}
// ../../node_modules/.pnpm/entities@4.5.0/node_modules/entities/lib/esm/decode.js
var CharCodes;
(function(CharCodes2) {
  CharCodes2[CharCodes2["NUM"] = 35] = "NUM";
  CharCodes2[CharCodes2["SEMI"] = 59] = "SEMI";
  CharCodes2[CharCodes2["EQUALS"] = 61] = "EQUALS";
  CharCodes2[CharCodes2["ZERO"] = 48] = "ZERO";
  CharCodes2[CharCodes2["NINE"] = 57] = "NINE";
  CharCodes2[CharCodes2["LOWER_A"] = 97] = "LOWER_A";
  CharCodes2[CharCodes2["LOWER_F"] = 102] = "LOWER_F";
  CharCodes2[CharCodes2["LOWER_X"] = 120] = "LOWER_X";
  CharCodes2[CharCodes2["LOWER_Z"] = 122] = "LOWER_Z";
  CharCodes2[CharCodes2["UPPER_A"] = 65] = "UPPER_A";
  CharCodes2[CharCodes2["UPPER_F"] = 70] = "UPPER_F";
  CharCodes2[CharCodes2["UPPER_Z"] = 90] = "UPPER_Z";
})(CharCodes || (CharCodes = {}));
var TO_LOWER_BIT = 32;
var BinTrieFlags;
(function(BinTrieFlags2) {
  BinTrieFlags2[BinTrieFlags2["VALUE_LENGTH"] = 49152] = "VALUE_LENGTH";
  BinTrieFlags2[BinTrieFlags2["BRANCH_LENGTH"] = 16256] = "BRANCH_LENGTH";
  BinTrieFlags2[BinTrieFlags2["JUMP_TABLE"] = 127] = "JUMP_TABLE";
})(BinTrieFlags || (BinTrieFlags = {}));
function isNumber(code) {
  return code >= CharCodes.ZERO && code <= CharCodes.NINE;
}
function isHexadecimalCharacter(code) {
  return code >= CharCodes.UPPER_A && code <= CharCodes.UPPER_F || code >= CharCodes.LOWER_A && code <= CharCodes.LOWER_F;
}
function isAsciiAlphaNumeric(code) {
  return code >= CharCodes.UPPER_A && code <= CharCodes.UPPER_Z || code >= CharCodes.LOWER_A && code <= CharCodes.LOWER_Z || isNumber(code);
}
function isEntityInAttributeInvalidEnd(code) {
  return code === CharCodes.EQUALS || isAsciiAlphaNumeric(code);
}
var EntityDecoderState;
(function(EntityDecoderState2) {
  EntityDecoderState2[EntityDecoderState2["EntityStart"] = 0] = "EntityStart";
  EntityDecoderState2[EntityDecoderState2["NumericStart"] = 1] = "NumericStart";
  EntityDecoderState2[EntityDecoderState2["NumericDecimal"] = 2] = "NumericDecimal";
  EntityDecoderState2[EntityDecoderState2["NumericHex"] = 3] = "NumericHex";
  EntityDecoderState2[EntityDecoderState2["NamedEntity"] = 4] = "NamedEntity";
})(EntityDecoderState || (EntityDecoderState = {}));
var DecodingMode;
(function(DecodingMode2) {
  DecodingMode2[DecodingMode2["Legacy"] = 0] = "Legacy";
  DecodingMode2[DecodingMode2["Strict"] = 1] = "Strict";
  DecodingMode2[DecodingMode2["Attribute"] = 2] = "Attribute";
})(DecodingMode || (DecodingMode = {}));

class EntityDecoder {
  constructor(decodeTree, emitCodePoint, errors) {
    this.decodeTree = decodeTree;
    this.emitCodePoint = emitCodePoint;
    this.errors = errors;
    this.state = EntityDecoderState.EntityStart;
    this.consumed = 1;
    this.result = 0;
    this.treeIndex = 0;
    this.excess = 1;
    this.decodeMode = DecodingMode.Strict;
  }
  startEntity(decodeMode) {
    this.decodeMode = decodeMode;
    this.state = EntityDecoderState.EntityStart;
    this.result = 0;
    this.treeIndex = 0;
    this.excess = 1;
    this.consumed = 1;
  }
  write(str, offset) {
    switch (this.state) {
      case EntityDecoderState.EntityStart: {
        if (str.charCodeAt(offset) === CharCodes.NUM) {
          this.state = EntityDecoderState.NumericStart;
          this.consumed += 1;
          return this.stateNumericStart(str, offset + 1);
        }
        this.state = EntityDecoderState.NamedEntity;
        return this.stateNamedEntity(str, offset);
      }
      case EntityDecoderState.NumericStart: {
        return this.stateNumericStart(str, offset);
      }
      case EntityDecoderState.NumericDecimal: {
        return this.stateNumericDecimal(str, offset);
      }
      case EntityDecoderState.NumericHex: {
        return this.stateNumericHex(str, offset);
      }
      case EntityDecoderState.NamedEntity: {
        return this.stateNamedEntity(str, offset);
      }
    }
  }
  stateNumericStart(str, offset) {
    if (offset >= str.length) {
      return -1;
    }
    if ((str.charCodeAt(offset) | TO_LOWER_BIT) === CharCodes.LOWER_X) {
      this.state = EntityDecoderState.NumericHex;
      this.consumed += 1;
      return this.stateNumericHex(str, offset + 1);
    }
    this.state = EntityDecoderState.NumericDecimal;
    return this.stateNumericDecimal(str, offset);
  }
  addToNumericResult(str, start, end, base) {
    if (start !== end) {
      const digitCount = end - start;
      this.result = this.result * Math.pow(base, digitCount) + parseInt(str.substr(start, digitCount), base);
      this.consumed += digitCount;
    }
  }
  stateNumericHex(str, offset) {
    const startIdx = offset;
    while (offset < str.length) {
      const char = str.charCodeAt(offset);
      if (isNumber(char) || isHexadecimalCharacter(char)) {
        offset += 1;
      } else {
        this.addToNumericResult(str, startIdx, offset, 16);
        return this.emitNumericEntity(char, 3);
      }
    }
    this.addToNumericResult(str, startIdx, offset, 16);
    return -1;
  }
  stateNumericDecimal(str, offset) {
    const startIdx = offset;
    while (offset < str.length) {
      const char = str.charCodeAt(offset);
      if (isNumber(char)) {
        offset += 1;
      } else {
        this.addToNumericResult(str, startIdx, offset, 10);
        return this.emitNumericEntity(char, 2);
      }
    }
    this.addToNumericResult(str, startIdx, offset, 10);
    return -1;
  }
  emitNumericEntity(lastCp, expectedLength) {
    var _a2;
    if (this.consumed <= expectedLength) {
      (_a2 = this.errors) === null || _a2 === undefined || _a2.absenceOfDigitsInNumericCharacterReference(this.consumed);
      return 0;
    }
    if (lastCp === CharCodes.SEMI) {
      this.consumed += 1;
    } else if (this.decodeMode === DecodingMode.Strict) {
      return 0;
    }
    this.emitCodePoint(replaceCodePoint(this.result), this.consumed);
    if (this.errors) {
      if (lastCp !== CharCodes.SEMI) {
        this.errors.missingSemicolonAfterCharacterReference();
      }
      this.errors.validateNumericCharacterReference(this.result);
    }
    return this.consumed;
  }
  stateNamedEntity(str, offset) {
    const { decodeTree } = this;
    let current = decodeTree[this.treeIndex];
    let valueLength = (current & BinTrieFlags.VALUE_LENGTH) >> 14;
    for (;offset < str.length; offset++, this.excess++) {
      const char = str.charCodeAt(offset);
      this.treeIndex = determineBranch(decodeTree, current, this.treeIndex + Math.max(1, valueLength), char);
      if (this.treeIndex < 0) {
        return this.result === 0 || this.decodeMode === DecodingMode.Attribute && (valueLength === 0 || isEntityInAttributeInvalidEnd(char)) ? 0 : this.emitNotTerminatedNamedEntity();
      }
      current = decodeTree[this.treeIndex];
      valueLength = (current & BinTrieFlags.VALUE_LENGTH) >> 14;
      if (valueLength !== 0) {
        if (char === CharCodes.SEMI) {
          return this.emitNamedEntityData(this.treeIndex, valueLength, this.consumed + this.excess);
        }
        if (this.decodeMode !== DecodingMode.Strict) {
          this.result = this.treeIndex;
          this.consumed += this.excess;
          this.excess = 0;
        }
      }
    }
    return -1;
  }
  emitNotTerminatedNamedEntity() {
    var _a2;
    const { result, decodeTree } = this;
    const valueLength = (decodeTree[result] & BinTrieFlags.VALUE_LENGTH) >> 14;
    this.emitNamedEntityData(result, valueLength, this.consumed);
    (_a2 = this.errors) === null || _a2 === undefined || _a2.missingSemicolonAfterCharacterReference();
    return this.consumed;
  }
  emitNamedEntityData(result, valueLength, consumed) {
    const { decodeTree } = this;
    this.emitCodePoint(valueLength === 1 ? decodeTree[result] & ~BinTrieFlags.VALUE_LENGTH : decodeTree[result + 1], consumed);
    if (valueLength === 3) {
      this.emitCodePoint(decodeTree[result + 2], consumed);
    }
    return consumed;
  }
  end() {
    var _a2;
    switch (this.state) {
      case EntityDecoderState.NamedEntity: {
        return this.result !== 0 && (this.decodeMode !== DecodingMode.Attribute || this.result === this.treeIndex) ? this.emitNotTerminatedNamedEntity() : 0;
      }
      case EntityDecoderState.NumericDecimal: {
        return this.emitNumericEntity(0, 2);
      }
      case EntityDecoderState.NumericHex: {
        return this.emitNumericEntity(0, 3);
      }
      case EntityDecoderState.NumericStart: {
        (_a2 = this.errors) === null || _a2 === undefined || _a2.absenceOfDigitsInNumericCharacterReference(this.consumed);
        return 0;
      }
      case EntityDecoderState.EntityStart: {
        return 0;
      }
    }
  }
}
function getDecoder(decodeTree) {
  let ret = "";
  const decoder = new EntityDecoder(decodeTree, (str) => ret += fromCodePoint(str));
  return function decodeWithTrie(str, decodeMode) {
    let lastIndex = 0;
    let offset = 0;
    while ((offset = str.indexOf("&", offset)) >= 0) {
      ret += str.slice(lastIndex, offset);
      decoder.startEntity(decodeMode);
      const len = decoder.write(str, offset + 1);
      if (len < 0) {
        lastIndex = offset + decoder.end();
        break;
      }
      lastIndex = offset + len;
      offset = len === 0 ? lastIndex + 1 : lastIndex;
    }
    const result = ret + str.slice(lastIndex);
    ret = "";
    return result;
  };
}
function determineBranch(decodeTree, current, nodeIdx, char) {
  const branchCount = (current & BinTrieFlags.BRANCH_LENGTH) >> 7;
  const jumpOffset = current & BinTrieFlags.JUMP_TABLE;
  if (branchCount === 0) {
    return jumpOffset !== 0 && char === jumpOffset ? nodeIdx : -1;
  }
  if (jumpOffset) {
    const value = char - jumpOffset;
    return value < 0 || value >= branchCount ? -1 : decodeTree[nodeIdx + value] - 1;
  }
  let lo = nodeIdx;
  let hi = lo + branchCount - 1;
  while (lo <= hi) {
    const mid = lo + hi >>> 1;
    const midVal = decodeTree[mid];
    if (midVal < char) {
      lo = mid + 1;
    } else if (midVal > char) {
      hi = mid - 1;
    } else {
      return decodeTree[mid + branchCount];
    }
  }
  return -1;
}
var htmlDecoder = getDecoder(decode_data_html_default);
var xmlDecoder = getDecoder(decode_data_xml_default);

// ../../node_modules/.pnpm/htmlparser2@8.0.2/node_modules/htmlparser2/lib/esm/Tokenizer.js
var CharCodes2;
(function(CharCodes3) {
  CharCodes3[CharCodes3["Tab"] = 9] = "Tab";
  CharCodes3[CharCodes3["NewLine"] = 10] = "NewLine";
  CharCodes3[CharCodes3["FormFeed"] = 12] = "FormFeed";
  CharCodes3[CharCodes3["CarriageReturn"] = 13] = "CarriageReturn";
  CharCodes3[CharCodes3["Space"] = 32] = "Space";
  CharCodes3[CharCodes3["ExclamationMark"] = 33] = "ExclamationMark";
  CharCodes3[CharCodes3["Number"] = 35] = "Number";
  CharCodes3[CharCodes3["Amp"] = 38] = "Amp";
  CharCodes3[CharCodes3["SingleQuote"] = 39] = "SingleQuote";
  CharCodes3[CharCodes3["DoubleQuote"] = 34] = "DoubleQuote";
  CharCodes3[CharCodes3["Dash"] = 45] = "Dash";
  CharCodes3[CharCodes3["Slash"] = 47] = "Slash";
  CharCodes3[CharCodes3["Zero"] = 48] = "Zero";
  CharCodes3[CharCodes3["Nine"] = 57] = "Nine";
  CharCodes3[CharCodes3["Semi"] = 59] = "Semi";
  CharCodes3[CharCodes3["Lt"] = 60] = "Lt";
  CharCodes3[CharCodes3["Eq"] = 61] = "Eq";
  CharCodes3[CharCodes3["Gt"] = 62] = "Gt";
  CharCodes3[CharCodes3["Questionmark"] = 63] = "Questionmark";
  CharCodes3[CharCodes3["UpperA"] = 65] = "UpperA";
  CharCodes3[CharCodes3["LowerA"] = 97] = "LowerA";
  CharCodes3[CharCodes3["UpperF"] = 70] = "UpperF";
  CharCodes3[CharCodes3["LowerF"] = 102] = "LowerF";
  CharCodes3[CharCodes3["UpperZ"] = 90] = "UpperZ";
  CharCodes3[CharCodes3["LowerZ"] = 122] = "LowerZ";
  CharCodes3[CharCodes3["LowerX"] = 120] = "LowerX";
  CharCodes3[CharCodes3["OpeningSquareBracket"] = 91] = "OpeningSquareBracket";
})(CharCodes2 || (CharCodes2 = {}));
var State;
(function(State2) {
  State2[State2["Text"] = 1] = "Text";
  State2[State2["BeforeTagName"] = 2] = "BeforeTagName";
  State2[State2["InTagName"] = 3] = "InTagName";
  State2[State2["InSelfClosingTag"] = 4] = "InSelfClosingTag";
  State2[State2["BeforeClosingTagName"] = 5] = "BeforeClosingTagName";
  State2[State2["InClosingTagName"] = 6] = "InClosingTagName";
  State2[State2["AfterClosingTagName"] = 7] = "AfterClosingTagName";
  State2[State2["BeforeAttributeName"] = 8] = "BeforeAttributeName";
  State2[State2["InAttributeName"] = 9] = "InAttributeName";
  State2[State2["AfterAttributeName"] = 10] = "AfterAttributeName";
  State2[State2["BeforeAttributeValue"] = 11] = "BeforeAttributeValue";
  State2[State2["InAttributeValueDq"] = 12] = "InAttributeValueDq";
  State2[State2["InAttributeValueSq"] = 13] = "InAttributeValueSq";
  State2[State2["InAttributeValueNq"] = 14] = "InAttributeValueNq";
  State2[State2["BeforeDeclaration"] = 15] = "BeforeDeclaration";
  State2[State2["InDeclaration"] = 16] = "InDeclaration";
  State2[State2["InProcessingInstruction"] = 17] = "InProcessingInstruction";
  State2[State2["BeforeComment"] = 18] = "BeforeComment";
  State2[State2["CDATASequence"] = 19] = "CDATASequence";
  State2[State2["InSpecialComment"] = 20] = "InSpecialComment";
  State2[State2["InCommentLike"] = 21] = "InCommentLike";
  State2[State2["BeforeSpecialS"] = 22] = "BeforeSpecialS";
  State2[State2["SpecialStartSequence"] = 23] = "SpecialStartSequence";
  State2[State2["InSpecialTag"] = 24] = "InSpecialTag";
  State2[State2["BeforeEntity"] = 25] = "BeforeEntity";
  State2[State2["BeforeNumericEntity"] = 26] = "BeforeNumericEntity";
  State2[State2["InNamedEntity"] = 27] = "InNamedEntity";
  State2[State2["InNumericEntity"] = 28] = "InNumericEntity";
  State2[State2["InHexEntity"] = 29] = "InHexEntity";
})(State || (State = {}));
function isWhitespace(c) {
  return c === CharCodes2.Space || c === CharCodes2.NewLine || c === CharCodes2.Tab || c === CharCodes2.FormFeed || c === CharCodes2.CarriageReturn;
}
function isEndOfTagSection(c) {
  return c === CharCodes2.Slash || c === CharCodes2.Gt || isWhitespace(c);
}
function isNumber2(c) {
  return c >= CharCodes2.Zero && c <= CharCodes2.Nine;
}
function isASCIIAlpha(c) {
  return c >= CharCodes2.LowerA && c <= CharCodes2.LowerZ || c >= CharCodes2.UpperA && c <= CharCodes2.UpperZ;
}
function isHexDigit(c) {
  return c >= CharCodes2.UpperA && c <= CharCodes2.UpperF || c >= CharCodes2.LowerA && c <= CharCodes2.LowerF;
}
var QuoteType;
(function(QuoteType2) {
  QuoteType2[QuoteType2["NoValue"] = 0] = "NoValue";
  QuoteType2[QuoteType2["Unquoted"] = 1] = "Unquoted";
  QuoteType2[QuoteType2["Single"] = 2] = "Single";
  QuoteType2[QuoteType2["Double"] = 3] = "Double";
})(QuoteType || (QuoteType = {}));
var Sequences = {
  Cdata: new Uint8Array([67, 68, 65, 84, 65, 91]),
  CdataEnd: new Uint8Array([93, 93, 62]),
  CommentEnd: new Uint8Array([45, 45, 62]),
  ScriptEnd: new Uint8Array([60, 47, 115, 99, 114, 105, 112, 116]),
  StyleEnd: new Uint8Array([60, 47, 115, 116, 121, 108, 101]),
  TitleEnd: new Uint8Array([60, 47, 116, 105, 116, 108, 101])
};

class Tokenizer {
  constructor({ xmlMode = false, decodeEntities = true }, cbs) {
    this.cbs = cbs;
    this.state = State.Text;
    this.buffer = "";
    this.sectionStart = 0;
    this.index = 0;
    this.baseState = State.Text;
    this.isSpecial = false;
    this.running = true;
    this.offset = 0;
    this.currentSequence = undefined;
    this.sequenceIndex = 0;
    this.trieIndex = 0;
    this.trieCurrent = 0;
    this.entityResult = 0;
    this.entityExcess = 0;
    this.xmlMode = xmlMode;
    this.decodeEntities = decodeEntities;
    this.entityTrie = xmlMode ? decode_data_xml_default : decode_data_html_default;
  }
  reset() {
    this.state = State.Text;
    this.buffer = "";
    this.sectionStart = 0;
    this.index = 0;
    this.baseState = State.Text;
    this.currentSequence = undefined;
    this.running = true;
    this.offset = 0;
  }
  write(chunk) {
    this.offset += this.buffer.length;
    this.buffer = chunk;
    this.parse();
  }
  end() {
    if (this.running)
      this.finish();
  }
  pause() {
    this.running = false;
  }
  resume() {
    this.running = true;
    if (this.index < this.buffer.length + this.offset) {
      this.parse();
    }
  }
  getIndex() {
    return this.index;
  }
  getSectionStart() {
    return this.sectionStart;
  }
  stateText(c) {
    if (c === CharCodes2.Lt || !this.decodeEntities && this.fastForwardTo(CharCodes2.Lt)) {
      if (this.index > this.sectionStart) {
        this.cbs.ontext(this.sectionStart, this.index);
      }
      this.state = State.BeforeTagName;
      this.sectionStart = this.index;
    } else if (this.decodeEntities && c === CharCodes2.Amp) {
      this.state = State.BeforeEntity;
    }
  }
  stateSpecialStartSequence(c) {
    const isEnd = this.sequenceIndex === this.currentSequence.length;
    const isMatch = isEnd ? isEndOfTagSection(c) : (c | 32) === this.currentSequence[this.sequenceIndex];
    if (!isMatch) {
      this.isSpecial = false;
    } else if (!isEnd) {
      this.sequenceIndex++;
      return;
    }
    this.sequenceIndex = 0;
    this.state = State.InTagName;
    this.stateInTagName(c);
  }
  stateInSpecialTag(c) {
    if (this.sequenceIndex === this.currentSequence.length) {
      if (c === CharCodes2.Gt || isWhitespace(c)) {
        const endOfText = this.index - this.currentSequence.length;
        if (this.sectionStart < endOfText) {
          const actualIndex = this.index;
          this.index = endOfText;
          this.cbs.ontext(this.sectionStart, endOfText);
          this.index = actualIndex;
        }
        this.isSpecial = false;
        this.sectionStart = endOfText + 2;
        this.stateInClosingTagName(c);
        return;
      }
      this.sequenceIndex = 0;
    }
    if ((c | 32) === this.currentSequence[this.sequenceIndex]) {
      this.sequenceIndex += 1;
    } else if (this.sequenceIndex === 0) {
      if (this.currentSequence === Sequences.TitleEnd) {
        if (this.decodeEntities && c === CharCodes2.Amp) {
          this.state = State.BeforeEntity;
        }
      } else if (this.fastForwardTo(CharCodes2.Lt)) {
        this.sequenceIndex = 1;
      }
    } else {
      this.sequenceIndex = Number(c === CharCodes2.Lt);
    }
  }
  stateCDATASequence(c) {
    if (c === Sequences.Cdata[this.sequenceIndex]) {
      if (++this.sequenceIndex === Sequences.Cdata.length) {
        this.state = State.InCommentLike;
        this.currentSequence = Sequences.CdataEnd;
        this.sequenceIndex = 0;
        this.sectionStart = this.index + 1;
      }
    } else {
      this.sequenceIndex = 0;
      this.state = State.InDeclaration;
      this.stateInDeclaration(c);
    }
  }
  fastForwardTo(c) {
    while (++this.index < this.buffer.length + this.offset) {
      if (this.buffer.charCodeAt(this.index - this.offset) === c) {
        return true;
      }
    }
    this.index = this.buffer.length + this.offset - 1;
    return false;
  }
  stateInCommentLike(c) {
    if (c === this.currentSequence[this.sequenceIndex]) {
      if (++this.sequenceIndex === this.currentSequence.length) {
        if (this.currentSequence === Sequences.CdataEnd) {
          this.cbs.oncdata(this.sectionStart, this.index, 2);
        } else {
          this.cbs.oncomment(this.sectionStart, this.index, 2);
        }
        this.sequenceIndex = 0;
        this.sectionStart = this.index + 1;
        this.state = State.Text;
      }
    } else if (this.sequenceIndex === 0) {
      if (this.fastForwardTo(this.currentSequence[0])) {
        this.sequenceIndex = 1;
      }
    } else if (c !== this.currentSequence[this.sequenceIndex - 1]) {
      this.sequenceIndex = 0;
    }
  }
  isTagStartChar(c) {
    return this.xmlMode ? !isEndOfTagSection(c) : isASCIIAlpha(c);
  }
  startSpecial(sequence, offset) {
    this.isSpecial = true;
    this.currentSequence = sequence;
    this.sequenceIndex = offset;
    this.state = State.SpecialStartSequence;
  }
  stateBeforeTagName(c) {
    if (c === CharCodes2.ExclamationMark) {
      this.state = State.BeforeDeclaration;
      this.sectionStart = this.index + 1;
    } else if (c === CharCodes2.Questionmark) {
      this.state = State.InProcessingInstruction;
      this.sectionStart = this.index + 1;
    } else if (this.isTagStartChar(c)) {
      const lower = c | 32;
      this.sectionStart = this.index;
      if (!this.xmlMode && lower === Sequences.TitleEnd[2]) {
        this.startSpecial(Sequences.TitleEnd, 3);
      } else {
        this.state = !this.xmlMode && lower === Sequences.ScriptEnd[2] ? State.BeforeSpecialS : State.InTagName;
      }
    } else if (c === CharCodes2.Slash) {
      this.state = State.BeforeClosingTagName;
    } else {
      this.state = State.Text;
      this.stateText(c);
    }
  }
  stateInTagName(c) {
    if (isEndOfTagSection(c)) {
      this.cbs.onopentagname(this.sectionStart, this.index);
      this.sectionStart = -1;
      this.state = State.BeforeAttributeName;
      this.stateBeforeAttributeName(c);
    }
  }
  stateBeforeClosingTagName(c) {
    if (isWhitespace(c)) {} else if (c === CharCodes2.Gt) {
      this.state = State.Text;
    } else {
      this.state = this.isTagStartChar(c) ? State.InClosingTagName : State.InSpecialComment;
      this.sectionStart = this.index;
    }
  }
  stateInClosingTagName(c) {
    if (c === CharCodes2.Gt || isWhitespace(c)) {
      this.cbs.onclosetag(this.sectionStart, this.index);
      this.sectionStart = -1;
      this.state = State.AfterClosingTagName;
      this.stateAfterClosingTagName(c);
    }
  }
  stateAfterClosingTagName(c) {
    if (c === CharCodes2.Gt || this.fastForwardTo(CharCodes2.Gt)) {
      this.state = State.Text;
      this.baseState = State.Text;
      this.sectionStart = this.index + 1;
    }
  }
  stateBeforeAttributeName(c) {
    if (c === CharCodes2.Gt) {
      this.cbs.onopentagend(this.index);
      if (this.isSpecial) {
        this.state = State.InSpecialTag;
        this.sequenceIndex = 0;
      } else {
        this.state = State.Text;
      }
      this.baseState = this.state;
      this.sectionStart = this.index + 1;
    } else if (c === CharCodes2.Slash) {
      this.state = State.InSelfClosingTag;
    } else if (!isWhitespace(c)) {
      this.state = State.InAttributeName;
      this.sectionStart = this.index;
    }
  }
  stateInSelfClosingTag(c) {
    if (c === CharCodes2.Gt) {
      this.cbs.onselfclosingtag(this.index);
      this.state = State.Text;
      this.baseState = State.Text;
      this.sectionStart = this.index + 1;
      this.isSpecial = false;
    } else if (!isWhitespace(c)) {
      this.state = State.BeforeAttributeName;
      this.stateBeforeAttributeName(c);
    }
  }
  stateInAttributeName(c) {
    if (c === CharCodes2.Eq || isEndOfTagSection(c)) {
      this.cbs.onattribname(this.sectionStart, this.index);
      this.sectionStart = -1;
      this.state = State.AfterAttributeName;
      this.stateAfterAttributeName(c);
    }
  }
  stateAfterAttributeName(c) {
    if (c === CharCodes2.Eq) {
      this.state = State.BeforeAttributeValue;
    } else if (c === CharCodes2.Slash || c === CharCodes2.Gt) {
      this.cbs.onattribend(QuoteType.NoValue, this.index);
      this.state = State.BeforeAttributeName;
      this.stateBeforeAttributeName(c);
    } else if (!isWhitespace(c)) {
      this.cbs.onattribend(QuoteType.NoValue, this.index);
      this.state = State.InAttributeName;
      this.sectionStart = this.index;
    }
  }
  stateBeforeAttributeValue(c) {
    if (c === CharCodes2.DoubleQuote) {
      this.state = State.InAttributeValueDq;
      this.sectionStart = this.index + 1;
    } else if (c === CharCodes2.SingleQuote) {
      this.state = State.InAttributeValueSq;
      this.sectionStart = this.index + 1;
    } else if (!isWhitespace(c)) {
      this.sectionStart = this.index;
      this.state = State.InAttributeValueNq;
      this.stateInAttributeValueNoQuotes(c);
    }
  }
  handleInAttributeValue(c, quote) {
    if (c === quote || !this.decodeEntities && this.fastForwardTo(quote)) {
      this.cbs.onattribdata(this.sectionStart, this.index);
      this.sectionStart = -1;
      this.cbs.onattribend(quote === CharCodes2.DoubleQuote ? QuoteType.Double : QuoteType.Single, this.index);
      this.state = State.BeforeAttributeName;
    } else if (this.decodeEntities && c === CharCodes2.Amp) {
      this.baseState = this.state;
      this.state = State.BeforeEntity;
    }
  }
  stateInAttributeValueDoubleQuotes(c) {
    this.handleInAttributeValue(c, CharCodes2.DoubleQuote);
  }
  stateInAttributeValueSingleQuotes(c) {
    this.handleInAttributeValue(c, CharCodes2.SingleQuote);
  }
  stateInAttributeValueNoQuotes(c) {
    if (isWhitespace(c) || c === CharCodes2.Gt) {
      this.cbs.onattribdata(this.sectionStart, this.index);
      this.sectionStart = -1;
      this.cbs.onattribend(QuoteType.Unquoted, this.index);
      this.state = State.BeforeAttributeName;
      this.stateBeforeAttributeName(c);
    } else if (this.decodeEntities && c === CharCodes2.Amp) {
      this.baseState = this.state;
      this.state = State.BeforeEntity;
    }
  }
  stateBeforeDeclaration(c) {
    if (c === CharCodes2.OpeningSquareBracket) {
      this.state = State.CDATASequence;
      this.sequenceIndex = 0;
    } else {
      this.state = c === CharCodes2.Dash ? State.BeforeComment : State.InDeclaration;
    }
  }
  stateInDeclaration(c) {
    if (c === CharCodes2.Gt || this.fastForwardTo(CharCodes2.Gt)) {
      this.cbs.ondeclaration(this.sectionStart, this.index);
      this.state = State.Text;
      this.sectionStart = this.index + 1;
    }
  }
  stateInProcessingInstruction(c) {
    if (c === CharCodes2.Gt || this.fastForwardTo(CharCodes2.Gt)) {
      this.cbs.onprocessinginstruction(this.sectionStart, this.index);
      this.state = State.Text;
      this.sectionStart = this.index + 1;
    }
  }
  stateBeforeComment(c) {
    if (c === CharCodes2.Dash) {
      this.state = State.InCommentLike;
      this.currentSequence = Sequences.CommentEnd;
      this.sequenceIndex = 2;
      this.sectionStart = this.index + 1;
    } else {
      this.state = State.InDeclaration;
    }
  }
  stateInSpecialComment(c) {
    if (c === CharCodes2.Gt || this.fastForwardTo(CharCodes2.Gt)) {
      this.cbs.oncomment(this.sectionStart, this.index, 0);
      this.state = State.Text;
      this.sectionStart = this.index + 1;
    }
  }
  stateBeforeSpecialS(c) {
    const lower = c | 32;
    if (lower === Sequences.ScriptEnd[3]) {
      this.startSpecial(Sequences.ScriptEnd, 4);
    } else if (lower === Sequences.StyleEnd[3]) {
      this.startSpecial(Sequences.StyleEnd, 4);
    } else {
      this.state = State.InTagName;
      this.stateInTagName(c);
    }
  }
  stateBeforeEntity(c) {
    this.entityExcess = 1;
    this.entityResult = 0;
    if (c === CharCodes2.Number) {
      this.state = State.BeforeNumericEntity;
    } else if (c === CharCodes2.Amp) {} else {
      this.trieIndex = 0;
      this.trieCurrent = this.entityTrie[0];
      this.state = State.InNamedEntity;
      this.stateInNamedEntity(c);
    }
  }
  stateInNamedEntity(c) {
    this.entityExcess += 1;
    this.trieIndex = determineBranch(this.entityTrie, this.trieCurrent, this.trieIndex + 1, c);
    if (this.trieIndex < 0) {
      this.emitNamedEntity();
      this.index--;
      return;
    }
    this.trieCurrent = this.entityTrie[this.trieIndex];
    const masked = this.trieCurrent & BinTrieFlags.VALUE_LENGTH;
    if (masked) {
      const valueLength = (masked >> 14) - 1;
      if (!this.allowLegacyEntity() && c !== CharCodes2.Semi) {
        this.trieIndex += valueLength;
      } else {
        const entityStart = this.index - this.entityExcess + 1;
        if (entityStart > this.sectionStart) {
          this.emitPartial(this.sectionStart, entityStart);
        }
        this.entityResult = this.trieIndex;
        this.trieIndex += valueLength;
        this.entityExcess = 0;
        this.sectionStart = this.index + 1;
        if (valueLength === 0) {
          this.emitNamedEntity();
        }
      }
    }
  }
  emitNamedEntity() {
    this.state = this.baseState;
    if (this.entityResult === 0) {
      return;
    }
    const valueLength = (this.entityTrie[this.entityResult] & BinTrieFlags.VALUE_LENGTH) >> 14;
    switch (valueLength) {
      case 1: {
        this.emitCodePoint(this.entityTrie[this.entityResult] & ~BinTrieFlags.VALUE_LENGTH);
        break;
      }
      case 2: {
        this.emitCodePoint(this.entityTrie[this.entityResult + 1]);
        break;
      }
      case 3: {
        this.emitCodePoint(this.entityTrie[this.entityResult + 1]);
        this.emitCodePoint(this.entityTrie[this.entityResult + 2]);
      }
    }
  }
  stateBeforeNumericEntity(c) {
    if ((c | 32) === CharCodes2.LowerX) {
      this.entityExcess++;
      this.state = State.InHexEntity;
    } else {
      this.state = State.InNumericEntity;
      this.stateInNumericEntity(c);
    }
  }
  emitNumericEntity(strict) {
    const entityStart = this.index - this.entityExcess - 1;
    const numberStart = entityStart + 2 + Number(this.state === State.InHexEntity);
    if (numberStart !== this.index) {
      if (entityStart > this.sectionStart) {
        this.emitPartial(this.sectionStart, entityStart);
      }
      this.sectionStart = this.index + Number(strict);
      this.emitCodePoint(replaceCodePoint(this.entityResult));
    }
    this.state = this.baseState;
  }
  stateInNumericEntity(c) {
    if (c === CharCodes2.Semi) {
      this.emitNumericEntity(true);
    } else if (isNumber2(c)) {
      this.entityResult = this.entityResult * 10 + (c - CharCodes2.Zero);
      this.entityExcess++;
    } else {
      if (this.allowLegacyEntity()) {
        this.emitNumericEntity(false);
      } else {
        this.state = this.baseState;
      }
      this.index--;
    }
  }
  stateInHexEntity(c) {
    if (c === CharCodes2.Semi) {
      this.emitNumericEntity(true);
    } else if (isNumber2(c)) {
      this.entityResult = this.entityResult * 16 + (c - CharCodes2.Zero);
      this.entityExcess++;
    } else if (isHexDigit(c)) {
      this.entityResult = this.entityResult * 16 + ((c | 32) - CharCodes2.LowerA + 10);
      this.entityExcess++;
    } else {
      if (this.allowLegacyEntity()) {
        this.emitNumericEntity(false);
      } else {
        this.state = this.baseState;
      }
      this.index--;
    }
  }
  allowLegacyEntity() {
    return !this.xmlMode && (this.baseState === State.Text || this.baseState === State.InSpecialTag);
  }
  cleanup() {
    if (this.running && this.sectionStart !== this.index) {
      if (this.state === State.Text || this.state === State.InSpecialTag && this.sequenceIndex === 0) {
        this.cbs.ontext(this.sectionStart, this.index);
        this.sectionStart = this.index;
      } else if (this.state === State.InAttributeValueDq || this.state === State.InAttributeValueSq || this.state === State.InAttributeValueNq) {
        this.cbs.onattribdata(this.sectionStart, this.index);
        this.sectionStart = this.index;
      }
    }
  }
  shouldContinue() {
    return this.index < this.buffer.length + this.offset && this.running;
  }
  parse() {
    while (this.shouldContinue()) {
      const c = this.buffer.charCodeAt(this.index - this.offset);
      switch (this.state) {
        case State.Text: {
          this.stateText(c);
          break;
        }
        case State.SpecialStartSequence: {
          this.stateSpecialStartSequence(c);
          break;
        }
        case State.InSpecialTag: {
          this.stateInSpecialTag(c);
          break;
        }
        case State.CDATASequence: {
          this.stateCDATASequence(c);
          break;
        }
        case State.InAttributeValueDq: {
          this.stateInAttributeValueDoubleQuotes(c);
          break;
        }
        case State.InAttributeName: {
          this.stateInAttributeName(c);
          break;
        }
        case State.InCommentLike: {
          this.stateInCommentLike(c);
          break;
        }
        case State.InSpecialComment: {
          this.stateInSpecialComment(c);
          break;
        }
        case State.BeforeAttributeName: {
          this.stateBeforeAttributeName(c);
          break;
        }
        case State.InTagName: {
          this.stateInTagName(c);
          break;
        }
        case State.InClosingTagName: {
          this.stateInClosingTagName(c);
          break;
        }
        case State.BeforeTagName: {
          this.stateBeforeTagName(c);
          break;
        }
        case State.AfterAttributeName: {
          this.stateAfterAttributeName(c);
          break;
        }
        case State.InAttributeValueSq: {
          this.stateInAttributeValueSingleQuotes(c);
          break;
        }
        case State.BeforeAttributeValue: {
          this.stateBeforeAttributeValue(c);
          break;
        }
        case State.BeforeClosingTagName: {
          this.stateBeforeClosingTagName(c);
          break;
        }
        case State.AfterClosingTagName: {
          this.stateAfterClosingTagName(c);
          break;
        }
        case State.BeforeSpecialS: {
          this.stateBeforeSpecialS(c);
          break;
        }
        case State.InAttributeValueNq: {
          this.stateInAttributeValueNoQuotes(c);
          break;
        }
        case State.InSelfClosingTag: {
          this.stateInSelfClosingTag(c);
          break;
        }
        case State.InDeclaration: {
          this.stateInDeclaration(c);
          break;
        }
        case State.BeforeDeclaration: {
          this.stateBeforeDeclaration(c);
          break;
        }
        case State.BeforeComment: {
          this.stateBeforeComment(c);
          break;
        }
        case State.InProcessingInstruction: {
          this.stateInProcessingInstruction(c);
          break;
        }
        case State.InNamedEntity: {
          this.stateInNamedEntity(c);
          break;
        }
        case State.BeforeEntity: {
          this.stateBeforeEntity(c);
          break;
        }
        case State.InHexEntity: {
          this.stateInHexEntity(c);
          break;
        }
        case State.InNumericEntity: {
          this.stateInNumericEntity(c);
          break;
        }
        default: {
          this.stateBeforeNumericEntity(c);
        }
      }
      this.index++;
    }
    this.cleanup();
  }
  finish() {
    if (this.state === State.InNamedEntity) {
      this.emitNamedEntity();
    }
    if (this.sectionStart < this.index) {
      this.handleTrailingData();
    }
    this.cbs.onend();
  }
  handleTrailingData() {
    const endIndex = this.buffer.length + this.offset;
    if (this.state === State.InCommentLike) {
      if (this.currentSequence === Sequences.CdataEnd) {
        this.cbs.oncdata(this.sectionStart, endIndex, 0);
      } else {
        this.cbs.oncomment(this.sectionStart, endIndex, 0);
      }
    } else if (this.state === State.InNumericEntity && this.allowLegacyEntity()) {
      this.emitNumericEntity(false);
    } else if (this.state === State.InHexEntity && this.allowLegacyEntity()) {
      this.emitNumericEntity(false);
    } else if (this.state === State.InTagName || this.state === State.BeforeAttributeName || this.state === State.BeforeAttributeValue || this.state === State.AfterAttributeName || this.state === State.InAttributeName || this.state === State.InAttributeValueSq || this.state === State.InAttributeValueDq || this.state === State.InAttributeValueNq || this.state === State.InClosingTagName) {} else {
      this.cbs.ontext(this.sectionStart, endIndex);
    }
  }
  emitPartial(start, endIndex) {
    if (this.baseState !== State.Text && this.baseState !== State.InSpecialTag) {
      this.cbs.onattribdata(start, endIndex);
    } else {
      this.cbs.ontext(start, endIndex);
    }
  }
  emitCodePoint(cp) {
    if (this.baseState !== State.Text && this.baseState !== State.InSpecialTag) {
      this.cbs.onattribentity(cp);
    } else {
      this.cbs.ontextentity(cp);
    }
  }
}

// ../../node_modules/.pnpm/htmlparser2@8.0.2/node_modules/htmlparser2/lib/esm/Parser.js
var formTags = new Set([
  "input",
  "option",
  "optgroup",
  "select",
  "button",
  "datalist",
  "textarea"
]);
var pTag = new Set(["p"]);
var tableSectionTags = new Set(["thead", "tbody"]);
var ddtTags = new Set(["dd", "dt"]);
var rtpTags = new Set(["rt", "rp"]);
var openImpliesClose = new Map([
  ["tr", new Set(["tr", "th", "td"])],
  ["th", new Set(["th"])],
  ["td", new Set(["thead", "th", "td"])],
  ["body", new Set(["head", "link", "script"])],
  ["li", new Set(["li"])],
  ["p", pTag],
  ["h1", pTag],
  ["h2", pTag],
  ["h3", pTag],
  ["h4", pTag],
  ["h5", pTag],
  ["h6", pTag],
  ["select", formTags],
  ["input", formTags],
  ["output", formTags],
  ["button", formTags],
  ["datalist", formTags],
  ["textarea", formTags],
  ["option", new Set(["option"])],
  ["optgroup", new Set(["optgroup", "option"])],
  ["dd", ddtTags],
  ["dt", ddtTags],
  ["address", pTag],
  ["article", pTag],
  ["aside", pTag],
  ["blockquote", pTag],
  ["details", pTag],
  ["div", pTag],
  ["dl", pTag],
  ["fieldset", pTag],
  ["figcaption", pTag],
  ["figure", pTag],
  ["footer", pTag],
  ["form", pTag],
  ["header", pTag],
  ["hr", pTag],
  ["main", pTag],
  ["nav", pTag],
  ["ol", pTag],
  ["pre", pTag],
  ["section", pTag],
  ["table", pTag],
  ["ul", pTag],
  ["rt", rtpTags],
  ["rp", rtpTags],
  ["tbody", tableSectionTags],
  ["tfoot", tableSectionTags]
]);
var voidElements = new Set([
  "area",
  "base",
  "basefont",
  "br",
  "col",
  "command",
  "embed",
  "frame",
  "hr",
  "img",
  "input",
  "isindex",
  "keygen",
  "link",
  "meta",
  "param",
  "source",
  "track",
  "wbr"
]);
var foreignContextElements = new Set(["math", "svg"]);
var htmlIntegrationElements = new Set([
  "mi",
  "mo",
  "mn",
  "ms",
  "mtext",
  "annotation-xml",
  "foreignobject",
  "desc",
  "title"
]);
var reNameEnd = /\s|\//;

class Parser {
  constructor(cbs, options = {}) {
    var _a2, _b, _c, _d, _e;
    this.options = options;
    this.startIndex = 0;
    this.endIndex = 0;
    this.openTagStart = 0;
    this.tagname = "";
    this.attribname = "";
    this.attribvalue = "";
    this.attribs = null;
    this.stack = [];
    this.foreignContext = [];
    this.buffers = [];
    this.bufferOffset = 0;
    this.writeIndex = 0;
    this.ended = false;
    this.cbs = cbs !== null && cbs !== undefined ? cbs : {};
    this.lowerCaseTagNames = (_a2 = options.lowerCaseTags) !== null && _a2 !== undefined ? _a2 : !options.xmlMode;
    this.lowerCaseAttributeNames = (_b = options.lowerCaseAttributeNames) !== null && _b !== undefined ? _b : !options.xmlMode;
    this.tokenizer = new ((_c = options.Tokenizer) !== null && _c !== undefined ? _c : Tokenizer)(this.options, this);
    (_e = (_d = this.cbs).onparserinit) === null || _e === undefined || _e.call(_d, this);
  }
  ontext(start, endIndex) {
    var _a2, _b;
    const data = this.getSlice(start, endIndex);
    this.endIndex = endIndex - 1;
    (_b = (_a2 = this.cbs).ontext) === null || _b === undefined || _b.call(_a2, data);
    this.startIndex = endIndex;
  }
  ontextentity(cp) {
    var _a2, _b;
    const index = this.tokenizer.getSectionStart();
    this.endIndex = index - 1;
    (_b = (_a2 = this.cbs).ontext) === null || _b === undefined || _b.call(_a2, fromCodePoint(cp));
    this.startIndex = index;
  }
  isVoidElement(name) {
    return !this.options.xmlMode && voidElements.has(name);
  }
  onopentagname(start, endIndex) {
    this.endIndex = endIndex;
    let name = this.getSlice(start, endIndex);
    if (this.lowerCaseTagNames) {
      name = name.toLowerCase();
    }
    this.emitOpenTag(name);
  }
  emitOpenTag(name) {
    var _a2, _b, _c, _d;
    this.openTagStart = this.startIndex;
    this.tagname = name;
    const impliesClose = !this.options.xmlMode && openImpliesClose.get(name);
    if (impliesClose) {
      while (this.stack.length > 0 && impliesClose.has(this.stack[this.stack.length - 1])) {
        const element = this.stack.pop();
        (_b = (_a2 = this.cbs).onclosetag) === null || _b === undefined || _b.call(_a2, element, true);
      }
    }
    if (!this.isVoidElement(name)) {
      this.stack.push(name);
      if (foreignContextElements.has(name)) {
        this.foreignContext.push(true);
      } else if (htmlIntegrationElements.has(name)) {
        this.foreignContext.push(false);
      }
    }
    (_d = (_c = this.cbs).onopentagname) === null || _d === undefined || _d.call(_c, name);
    if (this.cbs.onopentag)
      this.attribs = {};
  }
  endOpenTag(isImplied) {
    var _a2, _b;
    this.startIndex = this.openTagStart;
    if (this.attribs) {
      (_b = (_a2 = this.cbs).onopentag) === null || _b === undefined || _b.call(_a2, this.tagname, this.attribs, isImplied);
      this.attribs = null;
    }
    if (this.cbs.onclosetag && this.isVoidElement(this.tagname)) {
      this.cbs.onclosetag(this.tagname, true);
    }
    this.tagname = "";
  }
  onopentagend(endIndex) {
    this.endIndex = endIndex;
    this.endOpenTag(false);
    this.startIndex = endIndex + 1;
  }
  onclosetag(start, endIndex) {
    var _a2, _b, _c, _d, _e, _f;
    this.endIndex = endIndex;
    let name = this.getSlice(start, endIndex);
    if (this.lowerCaseTagNames) {
      name = name.toLowerCase();
    }
    if (foreignContextElements.has(name) || htmlIntegrationElements.has(name)) {
      this.foreignContext.pop();
    }
    if (!this.isVoidElement(name)) {
      const pos = this.stack.lastIndexOf(name);
      if (pos !== -1) {
        if (this.cbs.onclosetag) {
          let count = this.stack.length - pos;
          while (count--) {
            this.cbs.onclosetag(this.stack.pop(), count !== 0);
          }
        } else
          this.stack.length = pos;
      } else if (!this.options.xmlMode && name === "p") {
        this.emitOpenTag("p");
        this.closeCurrentTag(true);
      }
    } else if (!this.options.xmlMode && name === "br") {
      (_b = (_a2 = this.cbs).onopentagname) === null || _b === undefined || _b.call(_a2, "br");
      (_d = (_c = this.cbs).onopentag) === null || _d === undefined || _d.call(_c, "br", {}, true);
      (_f = (_e = this.cbs).onclosetag) === null || _f === undefined || _f.call(_e, "br", false);
    }
    this.startIndex = endIndex + 1;
  }
  onselfclosingtag(endIndex) {
    this.endIndex = endIndex;
    if (this.options.xmlMode || this.options.recognizeSelfClosing || this.foreignContext[this.foreignContext.length - 1]) {
      this.closeCurrentTag(false);
      this.startIndex = endIndex + 1;
    } else {
      this.onopentagend(endIndex);
    }
  }
  closeCurrentTag(isOpenImplied) {
    var _a2, _b;
    const name = this.tagname;
    this.endOpenTag(isOpenImplied);
    if (this.stack[this.stack.length - 1] === name) {
      (_b = (_a2 = this.cbs).onclosetag) === null || _b === undefined || _b.call(_a2, name, !isOpenImplied);
      this.stack.pop();
    }
  }
  onattribname(start, endIndex) {
    this.startIndex = start;
    const name = this.getSlice(start, endIndex);
    this.attribname = this.lowerCaseAttributeNames ? name.toLowerCase() : name;
  }
  onattribdata(start, endIndex) {
    this.attribvalue += this.getSlice(start, endIndex);
  }
  onattribentity(cp) {
    this.attribvalue += fromCodePoint(cp);
  }
  onattribend(quote, endIndex) {
    var _a2, _b;
    this.endIndex = endIndex;
    (_b = (_a2 = this.cbs).onattribute) === null || _b === undefined || _b.call(_a2, this.attribname, this.attribvalue, quote === QuoteType.Double ? '"' : quote === QuoteType.Single ? "'" : quote === QuoteType.NoValue ? undefined : null);
    if (this.attribs && !Object.prototype.hasOwnProperty.call(this.attribs, this.attribname)) {
      this.attribs[this.attribname] = this.attribvalue;
    }
    this.attribvalue = "";
  }
  getInstructionName(value) {
    const index = value.search(reNameEnd);
    let name = index < 0 ? value : value.substr(0, index);
    if (this.lowerCaseTagNames) {
      name = name.toLowerCase();
    }
    return name;
  }
  ondeclaration(start, endIndex) {
    this.endIndex = endIndex;
    const value = this.getSlice(start, endIndex);
    if (this.cbs.onprocessinginstruction) {
      const name = this.getInstructionName(value);
      this.cbs.onprocessinginstruction(`!${name}`, `!${value}`);
    }
    this.startIndex = endIndex + 1;
  }
  onprocessinginstruction(start, endIndex) {
    this.endIndex = endIndex;
    const value = this.getSlice(start, endIndex);
    if (this.cbs.onprocessinginstruction) {
      const name = this.getInstructionName(value);
      this.cbs.onprocessinginstruction(`?${name}`, `?${value}`);
    }
    this.startIndex = endIndex + 1;
  }
  oncomment(start, endIndex, offset) {
    var _a2, _b, _c, _d;
    this.endIndex = endIndex;
    (_b = (_a2 = this.cbs).oncomment) === null || _b === undefined || _b.call(_a2, this.getSlice(start, endIndex - offset));
    (_d = (_c = this.cbs).oncommentend) === null || _d === undefined || _d.call(_c);
    this.startIndex = endIndex + 1;
  }
  oncdata(start, endIndex, offset) {
    var _a2, _b, _c, _d, _e, _f, _g, _h, _j, _k;
    this.endIndex = endIndex;
    const value = this.getSlice(start, endIndex - offset);
    if (this.options.xmlMode || this.options.recognizeCDATA) {
      (_b = (_a2 = this.cbs).oncdatastart) === null || _b === undefined || _b.call(_a2);
      (_d = (_c = this.cbs).ontext) === null || _d === undefined || _d.call(_c, value);
      (_f = (_e = this.cbs).oncdataend) === null || _f === undefined || _f.call(_e);
    } else {
      (_h = (_g = this.cbs).oncomment) === null || _h === undefined || _h.call(_g, `[CDATA[${value}]]`);
      (_k = (_j = this.cbs).oncommentend) === null || _k === undefined || _k.call(_j);
    }
    this.startIndex = endIndex + 1;
  }
  onend() {
    var _a2, _b;
    if (this.cbs.onclosetag) {
      this.endIndex = this.startIndex;
      for (let index = this.stack.length;index > 0; this.cbs.onclosetag(this.stack[--index], true))
        ;
    }
    (_b = (_a2 = this.cbs).onend) === null || _b === undefined || _b.call(_a2);
  }
  reset() {
    var _a2, _b, _c, _d;
    (_b = (_a2 = this.cbs).onreset) === null || _b === undefined || _b.call(_a2);
    this.tokenizer.reset();
    this.tagname = "";
    this.attribname = "";
    this.attribs = null;
    this.stack.length = 0;
    this.startIndex = 0;
    this.endIndex = 0;
    (_d = (_c = this.cbs).onparserinit) === null || _d === undefined || _d.call(_c, this);
    this.buffers.length = 0;
    this.bufferOffset = 0;
    this.writeIndex = 0;
    this.ended = false;
  }
  parseComplete(data) {
    this.reset();
    this.end(data);
  }
  getSlice(start, end) {
    while (start - this.bufferOffset >= this.buffers[0].length) {
      this.shiftBuffer();
    }
    let slice = this.buffers[0].slice(start - this.bufferOffset, end - this.bufferOffset);
    while (end - this.bufferOffset > this.buffers[0].length) {
      this.shiftBuffer();
      slice += this.buffers[0].slice(0, end - this.bufferOffset);
    }
    return slice;
  }
  shiftBuffer() {
    this.bufferOffset += this.buffers[0].length;
    this.writeIndex--;
    this.buffers.shift();
  }
  write(chunk) {
    var _a2, _b;
    if (this.ended) {
      (_b = (_a2 = this.cbs).onerror) === null || _b === undefined || _b.call(_a2, new Error(".write() after done!"));
      return;
    }
    this.buffers.push(chunk);
    if (this.tokenizer.running) {
      this.tokenizer.write(chunk);
      this.writeIndex++;
    }
  }
  end(chunk) {
    var _a2, _b;
    if (this.ended) {
      (_b = (_a2 = this.cbs).onerror) === null || _b === undefined || _b.call(_a2, new Error(".end() after done!"));
      return;
    }
    if (chunk)
      this.write(chunk);
    this.ended = true;
    this.tokenizer.end();
  }
  pause() {
    this.tokenizer.pause();
  }
  resume() {
    this.tokenizer.resume();
    while (this.tokenizer.running && this.writeIndex < this.buffers.length) {
      this.tokenizer.write(this.buffers[this.writeIndex++]);
    }
    if (this.ended)
      this.tokenizer.end();
  }
  parseChunk(chunk) {
    this.write(chunk);
  }
  done(chunk) {
    this.end(chunk);
  }
}
// ../../packages/workbook/src/ooxml-package.ts
var ZIP_LOCAL_FILE_HEADER = 67324752;
var ZIP_CENTRAL_DIRECTORY_HEADER = 33639248;
var ZIP_END_OF_CENTRAL_DIRECTORY = 101010256;
var ZIP_FLAG_ENCRYPTED = 1;
var ZIP_FLAG_DATA_DESCRIPTOR = 8;
var ZIP_FLAG_STRONG_ENCRYPTION = 64;
var ZIP_STORED = 0;
var ZIP_DEFLATE = 8;
var MAX_COMPRESSED_BYTES = 12 * 1024 * 1024;
var MAX_ZIP_ENTRIES = 128;
var MAX_TOTAL_UNCOMPRESSED_BYTES = 10 * 1024 * 1024;
var MAX_ENTRY_UNCOMPRESSED_BYTES = 2 * 1024 * 1024;
var MAX_ZIP_COMPRESSION_RATIO = 100;
var textEncoder = new TextEncoder;
var textDecoder = new TextDecoder("utf-8");
function utf8Bytes(text) {
  return textEncoder.encode(text);
}
function utf8Text(bytes) {
  return textDecoder.decode(bytes);
}
function utf8ByteLength(text) {
  return textEncoder.encode(text).byteLength;
}
function dataView(bytes) {
  return new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
}
function concatBytes(chunks) {
  const total = chunks.reduce((sum, chunk) => sum + chunk.byteLength, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    out.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return out;
}
async function readStreamBounded(stream, limit, label) {
  const reader = stream.getReader();
  const chunks = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done)
        break;
      total += value.byteLength;
      if (total > limit) {
        await reader.cancel();
        throw new Error(`ZIP entry ${label} inflated beyond its declared size.`);
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  return concatBytes(chunks);
}
function byteStream(data) {
  const chunk = new Uint8Array(data.byteLength);
  chunk.set(data);
  return new ReadableStream({
    start(controller) {
      controller.enqueue(chunk);
      controller.close();
    }
  });
}
async function inflateRaw(data, limit, label) {
  const stream = byteStream(data).pipeThrough(new DecompressionStream("deflate-raw"));
  return await readStreamBounded(stream, limit, label);
}
async function deflateRaw(data) {
  const stream = byteStream(data).pipeThrough(new CompressionStream("deflate-raw"));
  return await readStreamBounded(stream, MAX_ENTRY_UNCOMPRESSED_BYTES + 1024, "(deflate)");
}
function findEndOfCentralDirectory(bytes) {
  const view = dataView(bytes);
  const start = Math.max(0, bytes.byteLength - 65535 - 22);
  for (let offset = bytes.byteLength - 22;offset >= start; offset -= 1) {
    if (offset < 0 || view.getUint32(offset, true) !== ZIP_END_OF_CENTRAL_DIRECTORY)
      continue;
    const commentLength = view.getUint16(offset + 20, true);
    if (offset + 22 + commentLength === bytes.byteLength)
      return offset;
  }
  throw new Error("ZIP end-of-central-directory not found.");
}
function rejectUnsafeZipFlags(flags, name) {
  if ((flags & ZIP_FLAG_ENCRYPTED) !== 0)
    throw new Error(`ZIP entry ${name} is encrypted.`);
  if ((flags & ZIP_FLAG_STRONG_ENCRYPTION) !== 0)
    throw new Error(`ZIP entry ${name} uses strong encryption.`);
}
function localSizeMatches(localFlags, localSize, centralSize) {
  if (localSize === centralSize)
    return true;
  return (localFlags & ZIP_FLAG_DATA_DESCRIPTOR) !== 0 && localSize === 0;
}
function listZipEntries(bytes) {
  if (bytes.byteLength > MAX_COMPRESSED_BYTES)
    throw new Error("ZIP input exceeds compressed byte limit.");
  const view = dataView(bytes);
  const eocd = findEndOfCentralDirectory(bytes);
  const disk = view.getUint16(eocd + 4, true);
  const centralDisk = view.getUint16(eocd + 6, true);
  const countOnDisk = view.getUint16(eocd + 8, true);
  const count = view.getUint16(eocd + 10, true);
  const centralSize = view.getUint32(eocd + 12, true);
  const centralOffset = view.getUint32(eocd + 16, true);
  const centralEnd = centralOffset + centralSize;
  if (disk !== 0 || centralDisk !== 0 || countOnDisk !== count)
    throw new Error("Multi-disk ZIP archives are not supported.");
  if (count === 65535 || centralSize === 4294967295 || centralOffset === 4294967295)
    throw new Error("ZIP64 archives are not supported.");
  if (count > MAX_ZIP_ENTRIES)
    throw new Error(`ZIP entry count ${count} exceeds limit ${MAX_ZIP_ENTRIES}.`);
  if (centralOffset + centralSize > bytes.byteLength)
    throw new Error("ZIP central directory is out of bounds.");
  if (centralEnd > eocd)
    throw new Error("ZIP central directory overlaps the end-of-central-directory record.");
  const entries = [];
  let cursor = centralOffset;
  let totalUncompressed = 0;
  for (let index = 0;index < count; index += 1) {
    if (cursor + 46 > centralEnd || view.getUint32(cursor, true) !== ZIP_CENTRAL_DIRECTORY_HEADER)
      throw new Error("Invalid ZIP central directory entry.");
    const flags = view.getUint16(cursor + 8, true);
    const method = view.getUint16(cursor + 10, true);
    const compressedSize = view.getUint32(cursor + 20, true);
    const uncompressedSize = view.getUint32(cursor + 24, true);
    const nameLength = view.getUint16(cursor + 28, true);
    const extraLength = view.getUint16(cursor + 30, true);
    const commentLength = view.getUint16(cursor + 32, true);
    const localOffset = view.getUint32(cursor + 42, true);
    if (compressedSize === 4294967295 || uncompressedSize === 4294967295 || localOffset === 4294967295)
      throw new Error("ZIP64 archives are not supported.");
    if (cursor + 46 + nameLength + extraLength + commentLength > centralEnd)
      throw new Error("ZIP central directory entry is out of bounds.");
    const name = utf8Text(bytes.subarray(cursor + 46, cursor + 46 + nameLength));
    rejectUnsafeZipFlags(flags, name);
    if (method !== ZIP_STORED && method !== ZIP_DEFLATE)
      throw new Error(`ZIP entry ${name} uses unsupported compression method ${method}.`);
    if (uncompressedSize > MAX_ENTRY_UNCOMPRESSED_BYTES)
      throw new Error(`ZIP entry ${name} exceeds per-entry uncompressed limit.`);
    if (uncompressedSize > 0 && compressedSize === 0)
      throw new Error(`ZIP entry ${name} has an invalid compression ratio.`);
    if (compressedSize > 0 && uncompressedSize / compressedSize > MAX_ZIP_COMPRESSION_RATIO)
      throw new Error(`ZIP entry ${name} exceeds compression ratio limit.`);
    totalUncompressed += uncompressedSize;
    if (totalUncompressed > MAX_TOTAL_UNCOMPRESSED_BYTES)
      throw new Error("ZIP archive exceeds total uncompressed limit.");
    entries.push({ name, flags, method, compressedSize, uncompressedSize, localOffset });
    cursor += 46 + nameLength + extraLength + commentLength;
  }
  if (cursor !== centralEnd)
    throw new Error("ZIP central directory size does not match its entries.");
  return entries;
}
async function readZipEntryData(bytes, entry) {
  const view = dataView(bytes);
  const cursor = entry.localOffset;
  if (cursor + 30 > bytes.byteLength || view.getUint32(cursor, true) !== ZIP_LOCAL_FILE_HEADER)
    throw new Error(`Invalid local ZIP header for ${entry.name}.`);
  const localFlags = view.getUint16(cursor + 6, true);
  const localMethod = view.getUint16(cursor + 8, true);
  const localCompressedSize = view.getUint32(cursor + 18, true);
  const localUncompressedSize = view.getUint32(cursor + 22, true);
  const nameLength = view.getUint16(cursor + 26, true);
  const extraLength = view.getUint16(cursor + 28, true);
  rejectUnsafeZipFlags(localFlags, entry.name);
  if (localMethod !== entry.method)
    throw new Error(`ZIP method mismatch for ${entry.name}.`);
  if (!localSizeMatches(localFlags, localCompressedSize, entry.compressedSize) || !localSizeMatches(localFlags, localUncompressedSize, entry.uncompressedSize))
    throw new Error(`ZIP size mismatch for ${entry.name}.`);
  if (cursor + 30 + nameLength + extraLength > bytes.byteLength)
    throw new Error(`ZIP local header for ${entry.name} is out of bounds.`);
  const localName = utf8Text(bytes.subarray(cursor + 30, cursor + 30 + nameLength));
  if (localName !== entry.name)
    throw new Error(`ZIP local header name mismatch for ${entry.name}.`);
  const dataStart = cursor + 30 + nameLength + extraLength;
  if (dataStart + entry.compressedSize > bytes.byteLength)
    throw new Error(`ZIP data for ${entry.name} is out of bounds.`);
  const compressed = bytes.subarray(dataStart, dataStart + entry.compressedSize);
  const data = entry.method === ZIP_STORED ? compressed.slice() : await inflateRaw(compressed, entry.uncompressedSize, entry.name);
  if (data.byteLength !== entry.uncompressedSize)
    throw new Error(`ZIP uncompressed size mismatch for ${entry.name}.`);
  return data;
}
function zipEntryMap(entries) {
  const map = new Map;
  for (const entry of entries)
    map.set(entry.name, entry);
  return map;
}
async function readZipTextEntry(bytes, entries, name) {
  const entry = entries.get(name);
  if (!entry)
    return null;
  const xml = utf8Text(await readZipEntryData(bytes, entry));
  assertSafeOfficeXml(xml);
  return xml;
}
var crcTable = null;
function crc32(bytes) {
  if (!crcTable) {
    crcTable = new Uint32Array(256);
    for (let n = 0;n < 256; n += 1) {
      let c = n;
      for (let k = 0;k < 8; k += 1)
        c = c & 1 ? 3988292384 ^ c >>> 1 : c >>> 1;
      crcTable[n] = c >>> 0;
    }
  }
  let crc = 4294967295;
  for (const byte of bytes)
    crc = crcTable[(crc ^ byte) & 255] ^ crc >>> 8;
  return (crc ^ 4294967295) >>> 0;
}
async function buildZip(files) {
  if (files.length > MAX_ZIP_ENTRIES)
    throw new Error(`ZIP entry count ${files.length} exceeds limit ${MAX_ZIP_ENTRIES}.`);
  const localChunks = [];
  const centralChunks = [];
  let offset = 0;
  let totalUncompressed = 0;
  for (const file of files) {
    if (file.data.byteLength > MAX_ENTRY_UNCOMPRESSED_BYTES)
      throw new Error(`ZIP entry ${file.name} exceeds per-entry uncompressed limit.`);
    totalUncompressed += file.data.byteLength;
    if (totalUncompressed > MAX_TOTAL_UNCOMPRESSED_BYTES)
      throw new Error("ZIP archive exceeds total uncompressed limit.");
    const deflated = await deflateRaw(file.data);
    const useDeflate = deflated.byteLength < file.data.byteLength && file.data.byteLength / Math.max(1, deflated.byteLength) <= MAX_ZIP_COMPRESSION_RATIO;
    const stored = useDeflate ? deflated : file.data;
    const method = useDeflate ? ZIP_DEFLATE : ZIP_STORED;
    const name = utf8Bytes(file.name);
    const checksum = crc32(file.data);
    const local = new Uint8Array(30);
    const localView = dataView(local);
    localView.setUint32(0, ZIP_LOCAL_FILE_HEADER, true);
    localView.setUint16(4, 20, true);
    localView.setUint16(6, 0, true);
    localView.setUint16(8, method, true);
    localView.setUint32(14, checksum, true);
    localView.setUint32(18, stored.byteLength, true);
    localView.setUint32(22, file.data.byteLength, true);
    localView.setUint16(26, name.byteLength, true);
    localChunks.push(local, name, stored);
    const central = new Uint8Array(46);
    const centralView = dataView(central);
    centralView.setUint32(0, ZIP_CENTRAL_DIRECTORY_HEADER, true);
    centralView.setUint16(4, 20, true);
    centralView.setUint16(6, 20, true);
    centralView.setUint16(8, 0, true);
    centralView.setUint16(10, method, true);
    centralView.setUint32(16, checksum, true);
    centralView.setUint32(20, stored.byteLength, true);
    centralView.setUint32(24, file.data.byteLength, true);
    centralView.setUint16(28, name.byteLength, true);
    centralView.setUint32(42, offset, true);
    centralChunks.push(central, name);
    offset += local.byteLength + name.byteLength + stored.byteLength;
  }
  const centralSize = centralChunks.reduce((sum, chunk) => sum + chunk.byteLength, 0);
  const end = new Uint8Array(22);
  const endView = dataView(end);
  endView.setUint32(0, ZIP_END_OF_CENTRAL_DIRECTORY, true);
  endView.setUint16(8, files.length, true);
  endView.setUint16(10, files.length, true);
  endView.setUint32(12, centralSize, true);
  endView.setUint32(16, offset, true);
  return concatBytes([...localChunks, ...centralChunks, end]);
}
function assertSafeOfficeXml(xml) {
  if (utf8ByteLength(xml) > MAX_ENTRY_UNCOMPRESSED_BYTES)
    throw new Error("Office XML exceeds the parser input limit.");
  const lower = xml.toLowerCase();
  if (lower.includes("<!doctype") || lower.includes("<!entity"))
    throw new Error("Office XML DTD and entity declarations are not supported.");
}
function xmlLocalName(name) {
  const colon = name.lastIndexOf(":");
  return (colon === -1 ? name : name.slice(colon + 1)).toLowerCase();
}
function parsedXmlText(xml, tagSeparator) {
  assertSafeOfficeXml(xml);
  let text = "";
  let omittedDepth = 0;
  const omittedSeparator = tagSeparator || " ";
  const parser = new Parser({
    onopentag(name) {
      if (omittedDepth > 0) {
        omittedDepth += 1;
      } else if (xmlLocalName(name) === "script" || xmlLocalName(name) === "style") {
        text += omittedSeparator;
        omittedDepth = 1;
      } else {
        text += tagSeparator;
      }
    },
    ontext(value) {
      if (omittedDepth === 0)
        text += value;
    },
    onclosetag() {
      if (omittedDepth > 0) {
        omittedDepth -= 1;
        if (omittedDepth === 0)
          text += omittedSeparator;
      } else {
        text += tagSeparator;
      }
    }
  }, { decodeEntities: true, xmlMode: true });
  parser.end(xml);
  return text;
}
function decodedXmlValue(value) {
  return parsedXmlText(`<openwork-value>${value}</openwork-value>`, "");
}
function xmlText(xml) {
  return parsedXmlText(xml, " ").replace(/\s+/g, " ").trim();
}
function xmlTagPattern(name) {
  return `(?:[A-Za-z_][\\w.-]*:)?${name}`;
}
function xmlAttributes(source) {
  const attributes = {};
  const regex = /([\w:.-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g;
  let match;
  while (match = regex.exec(source)) {
    const name = match[1];
    const value = match[2] ?? match[3] ?? "";
    attributes[name] = decodedXmlValue(value);
  }
  return attributes;
}
function xmlBlocks(xml, name) {
  const tag = xmlTagPattern(name);
  const regex = new RegExp(`<${tag}\\b([^>]*)>([\\s\\S]*?)<\\/${tag}>`, "g");
  const blocks = [];
  let match;
  while (match = regex.exec(xml)) {
    blocks.push({ attributes: xmlAttributes(match[1]), inner: match[2] });
  }
  return blocks;
}
function xmlStartTagAttributes(xml, name) {
  const tag = xmlTagPattern(name);
  const regex = new RegExp(`<${tag}\\b([^>]*)\\/?\\s*>`, "g");
  const attributes = [];
  let match;
  while (match = regex.exec(xml))
    attributes.push(xmlAttributes(match[1]));
  return attributes;
}
function firstXmlText(xml, name) {
  const block = xmlBlocks(xml, name)[0];
  if (!block)
    return;
  return parsedXmlText(block.inner, "").trim();
}
function xmlElements(xml, name) {
  const tag = xmlTagPattern(name);
  const regex = new RegExp(`<${tag}\\b([^>]*?)(\\/>|>([\\s\\S]*?)<\\/${tag}>)`, "g");
  const blocks = [];
  let match;
  while (match = regex.exec(xml)) {
    blocks.push({ attributes: xmlAttributes(match[1]), inner: match[3] ?? "" });
  }
  return blocks;
}
function escapeXml(value) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, "");
}
function normalizedZipPath(...segments) {
  const parts = [];
  for (const segment of segments.join("/").split("/")) {
    if (!segment || segment === ".")
      continue;
    if (segment === "..")
      parts.pop();
    else
      parts.push(segment);
  }
  return parts.join("/");
}
function relationshipTargets(xml, basePath) {
  const targets = new Map;
  if (!xml)
    return targets;
  for (const attributes of xmlStartTagAttributes(xml, "Relationship")) {
    const id = attributes.Id;
    const target = attributes.Target;
    if (!id || !target || attributes.TargetMode === "External" || /^[a-z][a-z0-9+.-]*:/i.test(target))
      continue;
    targets.set(id, target.startsWith("/") ? normalizedZipPath(target.slice(1)) : normalizedZipPath(basePath, target));
  }
  return targets;
}
// ../../packages/workbook/src/xlsx-workbook.ts
var XLSX_MAX_SHEETS = 64;
var XLSX_MAX_SHARED_STRINGS = 200000;
var XLSX_MAX_CELLS_PER_SHEET = 250000;
var XLSX_WRITE_MAX_SHEETS = 32;
var XLSX_WRITE_MAX_CELLS = 50000;
var EXCEL_MAX_ROWS = 1048576;
var EXCEL_MAX_COLUMNS = 16384;
var SHEET_NAME_MAX_CHARS = 31;
var CELL_TEXT_MAX_CHARS = 32767;
var EXCEL_EPOCH_1900_MS = Date.UTC(1899, 11, 30);
var EXCEL_EPOCH_1904_MS = Date.UTC(1904, 0, 1);
var MS_PER_DAY = 86400000;
function columnLetters(column) {
  let value = column;
  let letters = "";
  while (value > 0) {
    const remainder = (value - 1) % 26;
    letters = String.fromCharCode(65 + remainder) + letters;
    value = Math.floor((value - 1) / 26);
  }
  return letters;
}
function columnIndex(letters) {
  let value = 0;
  for (const char of letters.toUpperCase()) {
    const code = char.charCodeAt(0);
    if (code < 65 || code > 90)
      return 0;
    value = value * 26 + (code - 64);
  }
  return value;
}
function parseCellReference(reference) {
  const match = /^\$?([A-Za-z]{1,3})\$?(\d{1,7})$/.exec(reference.trim());
  if (!match)
    return null;
  const column = columnIndex(match[1]);
  const row = Number.parseInt(match[2], 10);
  if (column < 1 || column > EXCEL_MAX_COLUMNS || row < 1 || row > EXCEL_MAX_ROWS)
    return null;
  return { row, column };
}
function parseRange(range) {
  const trimmed = range.trim();
  const [startText, endText = startText] = trimmed.split(":");
  const start = parseCellReference(startText);
  const end = parseCellReference(endText);
  if (!start || !end)
    return null;
  return {
    firstRow: Math.min(start.row, end.row),
    lastRow: Math.max(start.row, end.row),
    firstColumn: Math.min(start.column, end.column),
    lastColumn: Math.max(start.column, end.column)
  };
}
function parseWorkbookSheets(workbookXml, relsXml) {
  const targets = relationshipTargets(relsXml, "xl");
  const declared = xmlStartTagAttributes(workbookXml, "sheet");
  const sheets = declared.slice(0, XLSX_MAX_SHEETS).map((attributes, index) => {
    const relationshipId = attributes["r:id"] ?? attributes.id ?? "";
    const path = relationshipId && targets.has(relationshipId) ? targets.get(relationshipId) ?? "" : `xl/worksheets/sheet${index + 1}.xml`;
    return {
      position: index + 1,
      name: attributes.name ?? `Sheet${index + 1}`,
      sheetId: attributes.sheetId ?? String(index + 1),
      relationshipId,
      path,
      hidden: attributes.state === "hidden" || attributes.state === "veryHidden"
    };
  });
  return { sheets, omittedSheets: declared.length - sheets.length };
}
function sharedStringText(xml) {
  const text = xmlBlocks(xml, "t").map((block) => parsedXmlText(block.inner, "")).join("").trim();
  return text || xmlText(xml);
}
function parseSharedStrings(xml) {
  if (!xml)
    return [];
  const strings = [];
  for (const block of xmlBlocks(xml, "si")) {
    if (strings.length >= XLSX_MAX_SHARED_STRINGS)
      break;
    strings.push(sharedStringText(block.inner));
  }
  return strings;
}
function builtinNumberFormat(id) {
  switch (id) {
    case "0":
      return "General";
    case "1":
      return "0";
    case "2":
      return "0.00";
    case "3":
      return "#,##0";
    case "4":
      return "#,##0.00";
    case "9":
      return "0%";
    case "10":
      return "0.00%";
    case "11":
      return "0.00E+00";
    case "14":
      return "mm-dd-yy";
    case "15":
      return "d-mmm-yy";
    case "16":
      return "d-mmm";
    case "17":
      return "mmm-yy";
    case "18":
      return "h:mm AM/PM";
    case "19":
      return "h:mm:ss AM/PM";
    case "20":
      return "h:mm";
    case "21":
      return "h:mm:ss";
    case "22":
      return "m/d/yy h:mm";
    case "27":
    case "28":
    case "29":
    case "30":
    case "31":
    case "36":
    case "50":
    case "51":
    case "52":
    case "53":
    case "54":
    case "57":
    case "58":
      return "yyyy-mm-dd";
    case "32":
    case "33":
    case "34":
    case "35":
    case "55":
    case "56":
      return "h:mm:ss";
    case "45":
      return "mm:ss";
    case "46":
      return "[h]:mm:ss";
    case "47":
      return "mmss.0";
    case "49":
      return "@";
    default:
      return "";
  }
}
function parseNumberFormats(stylesXml) {
  if (!stylesXml)
    return [];
  const custom = new Map;
  for (const attributes of xmlStartTagAttributes(stylesXml, "numFmt")) {
    if (attributes.numFmtId && attributes.formatCode)
      custom.set(attributes.numFmtId, attributes.formatCode);
  }
  const cellXfs = xmlBlocks(stylesXml, "cellXfs")[0]?.inner ?? "";
  return xmlStartTagAttributes(cellXfs, "xf").map((attributes) => {
    const id = attributes.numFmtId ?? "0";
    return custom.get(id) ?? builtinNumberFormat(id);
  });
}
function isDateNumberFormat(format) {
  if (!format || format === "General" || format === "@")
    return false;
  const stripped = format.replace(/"[^"]*"/g, "").replace(/\[[^\]]*\]/g, "").replace(/\\./g, "").replace(/[Ee][+-]/g, "");
  return /[ymdhs]/i.test(stripped);
}
function pad(value, width = 2) {
  return String(value).padStart(width, "0");
}
function excelSerialToIso(serial, date1904 = false) {
  if (!Number.isFinite(serial) || serial < 0 || serial > 2958465)
    return null;
  const epoch = date1904 ? EXCEL_EPOCH_1904_MS : serial < 60 ? EXCEL_EPOCH_1900_MS + MS_PER_DAY : EXCEL_EPOCH_1900_MS;
  const ms = Math.round(serial * MS_PER_DAY);
  const date = new Date(epoch + ms);
  if (Number.isNaN(date.getTime()))
    return null;
  const time = `${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}:${pad(date.getUTCSeconds())}`;
  if (serial < 1 && !date1904)
    return time;
  const day = `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
  if (ms % MS_PER_DAY === 0)
    return day;
  return `${day} ${time}`;
}
function cellTypeLabel(type) {
  if (type === "s")
    return "shared_string";
  if (type === "inlineStr")
    return "inline_string";
  if (type === "str")
    return "formula_string";
  if (type === "b")
    return "boolean";
  if (type === "e")
    return "error";
  if (type === "d")
    return "date";
  return type || "number";
}
function displayedCellValue(type, rawValue, body, sharedStrings, numberFormat, date1904) {
  if (type === "inlineStr") {
    const text = sharedStringText(body);
    return text || undefined;
  }
  if (type === "s" && rawValue !== undefined) {
    const index = Number.parseInt(rawValue, 10);
    return Number.isInteger(index) ? sharedStrings[index] : undefined;
  }
  if (type === "b" && rawValue !== undefined)
    return rawValue === "1" ? "TRUE" : "FALSE";
  if ((type === "" || type === "n") && rawValue !== undefined && isDateNumberFormat(numberFormat)) {
    return excelSerialToIso(Number(rawValue), date1904) ?? rawValue;
  }
  return rawValue;
}
function parseSheetData(xml, sharedStrings, numberFormats, date1904, cellLimit) {
  const dimension = xmlStartTagAttributes(xml, "dimension")[0]?.ref ?? "";
  const mergedRanges = [];
  for (const attributes of xmlStartTagAttributes(xml, "mergeCell")) {
    if (attributes.ref)
      mergedRanges.push(attributes.ref);
  }
  const sheetData = xmlBlocks(xml, "sheetData")[0]?.inner ?? xml;
  const cells = [];
  let omittedCells = 0;
  let formulaCount = 0;
  let impliedRow = 0;
  for (const rowBlock of xmlElements(sheetData, "row")) {
    const declaredRow = Number.parseInt(rowBlock.attributes.r ?? "", 10);
    const row = Number.isInteger(declaredRow) && declaredRow > 0 ? declaredRow : impliedRow + 1;
    impliedRow = row;
    let impliedColumn = 0;
    for (const cellBlock of xmlElements(rowBlock.inner, "c")) {
      const attributes = cellBlock.attributes;
      const body = cellBlock.inner;
      const declared = attributes.r ? parseCellReference(attributes.r) : null;
      const column = declared?.column ?? impliedColumn + 1;
      const cellRow = declared?.row ?? row;
      impliedColumn = column;
      const formulaBlock = xmlElements(body, "f")[0];
      const rawValue = firstXmlText(body, "v");
      const type = attributes.t ?? "";
      if (formulaBlock)
        formulaCount += 1;
      if (rawValue === undefined && !formulaBlock && type !== "inlineStr")
        continue;
      if (cells.length >= cellLimit) {
        omittedCells += 1;
        continue;
      }
      const styleIndex = attributes.s;
      const numberFormat = styleIndex !== undefined ? numberFormats[Number.parseInt(styleIndex, 10)] : undefined;
      const displayedValue = displayedCellValue(type, rawValue, body, sharedStrings, numberFormat, date1904);
      const formula = formulaBlock ? xmlText(formulaBlock.inner) : "";
      cells.push({
        reference: `${columnLetters(column)}${cellRow}`,
        row: cellRow,
        column,
        type: cellTypeLabel(type),
        ...styleIndex !== undefined ? { styleIndex } : {},
        ...numberFormat ? { numberFormat } : {},
        ...formulaBlock ? { formula } : {},
        ...formulaBlock?.attributes.t ? { formulaType: formulaBlock.attributes.t } : {},
        ...formulaBlock?.attributes.ref ? { formulaRef: formulaBlock.attributes.ref } : {},
        ...rawValue !== undefined ? { rawValue } : {},
        ...displayedValue !== undefined ? { displayedValue } : {}
      });
    }
  }
  return { dimension, mergedRanges, cells, omittedCells, formulaCount };
}
function sheetExtents(cells, dimension) {
  const parsed = cells.length === 0 && dimension ? parseRange(dimension) : null;
  if (parsed)
    return parsed;
  if (cells.length === 0)
    return { firstRow: 0, lastRow: 0, firstColumn: 0, lastColumn: 0 };
  let firstRow = Number.POSITIVE_INFINITY;
  let lastRow = 0;
  let firstColumn = Number.POSITIVE_INFINITY;
  let lastColumn = 0;
  for (const cell of cells) {
    firstRow = Math.min(firstRow, cell.row);
    lastRow = Math.max(lastRow, cell.row);
    firstColumn = Math.min(firstColumn, cell.column);
    lastColumn = Math.max(lastColumn, cell.column);
  }
  return { firstRow, lastRow, firstColumn, lastColumn };
}
async function openXlsxWorkbook(bytes) {
  const entries = zipEntryMap(listZipEntries(bytes));
  const workbookXml = await readZipTextEntry(bytes, entries, "xl/workbook.xml");
  if (!workbookXml)
    throw new Error("XLSX workbook.xml was not found.");
  const sharedStrings = parseSharedStrings(await readZipTextEntry(bytes, entries, "xl/sharedStrings.xml"));
  const numberFormats = parseNumberFormats(await readZipTextEntry(bytes, entries, "xl/styles.xml"));
  const { sheets, omittedSheets } = parseWorkbookSheets(workbookXml, await readZipTextEntry(bytes, entries, "xl/_rels/workbook.xml.rels"));
  if (sheets.length === 0)
    throw new Error("XLSX workbook contained no sheets.");
  const date1904 = xmlStartTagAttributes(workbookXml, "workbookPr").some((attributes) => attributes.date1904 === "1" || attributes.date1904 === "true");
  return {
    sheets,
    omittedSheets,
    sharedStringCount: sharedStrings.length,
    styleCount: numberFormats.length,
    date1904,
    async readSheet(sheet, options = {}) {
      const safePath = sheet.path.startsWith("xl/worksheets/") && sheet.path.endsWith(".xml") ? sheet.path : "";
      const sheetXml = safePath ? await readZipTextEntry(bytes, entries, safePath) : null;
      if (!sheetXml)
        throw new Error(`Worksheet XML for "${sheet.name}" was not found or was outside xl/worksheets.`);
      const data = parseSheetData(sheetXml, sharedStrings, numberFormats, date1904, options.cellLimit ?? XLSX_MAX_CELLS_PER_SHEET);
      return { info: sheet, ...data, ...sheetExtents(data.cells, data.dimension) };
    }
  };
}
function findSheet(workbook, selector) {
  if (selector === undefined || selector === "")
    return workbook.sheets[0];
  if (typeof selector === "number") {
    const sheet = workbook.sheets[selector - 1];
    if (!sheet)
      throw new Error(`Sheet position ${selector} is out of range; the workbook has ${workbook.sheets.length} sheet(s).`);
    return sheet;
  }
  const exact = workbook.sheets.find((sheet) => sheet.name === selector);
  if (exact)
    return exact;
  const lower = selector.trim().toLowerCase();
  const relaxed = workbook.sheets.find((sheet) => sheet.name.trim().toLowerCase() === lower);
  if (relaxed)
    return relaxed;
  const numeric = Number.parseInt(selector, 10);
  if (Number.isInteger(numeric) && String(numeric) === selector.trim())
    return findSheet(workbook, numeric);
  throw new Error(`Sheet "${selector}" was not found. Available sheets: ${workbook.sheets.map((sheet) => JSON.stringify(sheet.name)).join(", ")}.`);
}
var TABLE_SAFE_PIPE = "│";
function cellText(cell, formulas, maxChars) {
  if (!cell)
    return "";
  const value = formulas && cell.formula ? `=${cell.formula}` : cell.displayedValue ?? cell.rawValue ?? (cell.formula ? `=${cell.formula}` : "");
  const flat = value.replace(/\s*\r?\n\s*/g, " ").replaceAll("|", TABLE_SAFE_PIPE);
  return flat.length > maxChars ? `${flat.slice(0, maxChars - 1)}…` : flat;
}
function renderSheetTable(sheet, options = {}) {
  const range = options.range ? parseRange(options.range) : null;
  if (options.range && !range)
    throw new Error(`Range "${options.range}" is not a valid A1-style range such as A1:D20.`);
  const maxRows = Math.max(1, options.maxRows ?? 100);
  const maxColumns = Math.max(1, options.maxColumns ?? 40);
  const maxCellChars = Math.max(8, options.maxCellChars ?? 120);
  const formulas = options.formulas ?? false;
  const firstRow = Math.max(options.startRow ?? 1, range?.firstRow ?? 1);
  const lastRow = range?.lastRow ?? Number.POSITIVE_INFINITY;
  const firstColumn = range?.firstColumn ?? 1;
  const lastColumn = range?.lastColumn ?? Number.POSITIVE_INFINITY;
  const grid = new Map;
  const usedColumns = new Set;
  for (const cell of sheet.cells) {
    if (cell.column < firstColumn || cell.column > lastColumn)
      continue;
    if (cell.row < (range?.firstRow ?? 1) || cell.row > lastRow)
      continue;
    usedColumns.add(cell.column);
    let row = grid.get(cell.row);
    if (!row) {
      row = new Map;
      grid.set(cell.row, row);
    }
    row.set(cell.column, cell);
  }
  const orderedColumns = [...usedColumns].sort((left, right) => left - right);
  const visibleColumns = orderedColumns.slice(0, maxColumns);
  const truncatedColumns = orderedColumns.length - visibleColumns.length;
  const rowNumbers = [...grid.keys()].filter((row) => row >= firstRow).sort((left, right) => left - right);
  const pageRows = rowNumbers.slice(0, maxRows);
  const nextStartRow = rowNumbers.length > pageRows.length ? rowNumbers[pageRows.length] : null;
  const columns = visibleColumns.map(columnLetters);
  const lines = [];
  if (pageRows.length === 0) {
    lines.push("(no cells in this range)");
  } else {
    lines.push(`| # | ${columns.join(" | ")} |`);
    lines.push(`|---|${columns.map(() => "---").join("|")}|`);
    for (const rowNumber of pageRows) {
      const row = grid.get(rowNumber);
      lines.push(`| ${rowNumber} | ${visibleColumns.map((column) => cellText(row?.get(column), formulas, maxCellChars)).join(" | ")} |`);
    }
  }
  return { text: lines.join(`
`), renderedRows: pageRows.length, nextStartRow, columns, truncatedColumns };
}
function sheetHeaderRow(sheet, maxColumns = 30) {
  if (sheet.cells.length === 0)
    return [];
  const firstRow = Math.min(...sheet.cells.map((cell) => cell.row));
  return sheet.cells.filter((cell) => cell.row === firstRow).sort((left, right) => left.column - right.column).slice(0, maxColumns).map((cell) => cell.displayedValue ?? cell.rawValue ?? (cell.formula ? `=${cell.formula}` : ""));
}
function numberFormatSummary(sheet, maxFormats = 8, maxExamples = 3) {
  const examples = new Map;
  for (const cell of sheet.cells) {
    if (!cell.numberFormat || cell.numberFormat === "General")
      continue;
    const list = examples.get(cell.numberFormat) ?? [];
    if (list.length < maxExamples)
      list.push(cell.reference);
    examples.set(cell.numberFormat, list);
  }
  return [...examples.entries()].slice(0, maxFormats).map(([format, refs]) => `${JSON.stringify(format)} (${refs.join(", ")})`);
}
function formulaSummary(sheet, maxFormulas = 20) {
  return sheet.cells.filter((cell) => cell.formula).slice(0, maxFormulas).map((cell) => {
    const cached = cell.displayedValue ?? cell.rawValue;
    return `${cell.reference}: =${cell.formula}${cached !== undefined ? ` → ${cached}` : ""}`;
  });
}
var FORMULA_MAX_CHARS = 8192;
var OUTSIDE_WORKBOOK_FUNCTION = /\b(DDE|WEBSERVICE|FILTERXML|RTD|CALL|REGISTER(?:\.ID)?|EXEC|SQL\.REQUEST|IMPORT(?:DATA|XML|HTML|FEED|RANGE)|IMAGE)\s*\(/i;
var EXTERNAL_WORKBOOK_REFERENCE = /\[[^\]]*\][^!'"(),;+\-*/^&=<>\[\]{}]*!|'[^']*\[[^\]]*\][^']*'!/u;
var REMOTE_PATH_REFERENCE = /'[^']*(?::\/\/|\\\\)[^']*'!/;
function isFormulaInput(value) {
  return typeof value === "object" && value !== null && typeof value.formula === "string";
}
function unsafeFormulaReason(formula) {
  const body = formula.trim().replace(/^=/, "");
  if (!body)
    return "is empty";
  if (body.length > FORMULA_MAX_CHARS)
    return `is longer than ${FORMULA_MAX_CHARS} characters`;
  if (body.includes("|"))
    return "contains a DDE-style external command reference";
  const remote = OUTSIDE_WORKBOOK_FUNCTION.exec(body);
  if (remote)
    return `uses ${remote[1].toUpperCase()}, which reaches outside the workbook when it recalculates`;
  if (EXTERNAL_WORKBOOK_REFERENCE.test(body))
    return "references another workbook";
  if (REMOTE_PATH_REFERENCE.test(body))
    return "references a remote or network path";
  return null;
}
function formulaBody(value, reference) {
  const reason = unsafeFormulaReason(value.formula);
  if (reason)
    throw new Error(`Formula in ${reference} ${reason}; only calculations inside the workbook are written. Write the value instead.`);
  return value.formula.trim().replace(/^=/, "");
}
function sanitizeSheetName(name, position, taken) {
  const cleaned = (name ?? "").replace(/[\u0000-\u001f\u007f[\]:*?/\\]/g, " ").replace(/\s+/g, " ").replace(/^'+|'+$/g, "").trim().slice(0, SHEET_NAME_MAX_CHARS).trim();
  let candidate = cleaned || `Sheet${position}`;
  let suffix = 2;
  while (taken.has(candidate.toLowerCase()) || candidate.toLowerCase() === "history") {
    const base = candidate.slice(0, SHEET_NAME_MAX_CHARS - String(suffix).length - 1);
    candidate = `${base}-${suffix}`;
    suffix += 1;
  }
  taken.add(candidate.toLowerCase());
  return candidate;
}
function cellXml(reference, value, styleIndex) {
  const style = styleIndex > 0 ? ` s="${styleIndex}"` : "";
  if (value === null || value === "")
    return "";
  if (typeof value === "number") {
    if (!Number.isFinite(value))
      return `<c r="${reference}" t="e"${style}><v>#NUM!</v></c>`;
    return `<c r="${reference}"${style}><v>${value}</v></c>`;
  }
  if (typeof value === "boolean")
    return `<c r="${reference}" t="b"${style}><v>${value ? 1 : 0}</v></c>`;
  if (isFormulaInput(value))
    return `<c r="${reference}"${style}><f>${escapeXml(formulaBody(value, reference))}</f></c>`;
  if (value.length > CELL_TEXT_MAX_CHARS)
    throw new Error(`Cell ${reference} holds ${value.length} characters of text; Excel allows ${CELL_TEXT_MAX_CHARS}. Shorten it or split it across cells.`);
  const preserve = /^\s|\s$|\n/.test(value) ? ' xml:space="preserve"' : "";
  return `<c r="${reference}" t="inlineStr"${style}><is><t${preserve}>${escapeXml(value)}</t></is></c>`;
}
function displayWidth(value) {
  if (value === null)
    return 0;
  if (isFormulaInput(value))
    return 12;
  return String(value).split(`
`).reduce((max, line) => Math.max(max, line.length), 0);
}
function worksheetXml(sheet) {
  const rows = sheet.rows;
  const columnCount = rows.reduce((max, row) => Math.max(max, row.length), 0);
  if (rows.length > EXCEL_MAX_ROWS)
    throw new Error(`Sheet "${sheet.name ?? ""}" has ${rows.length} rows; Excel allows ${EXCEL_MAX_ROWS}.`);
  if (columnCount > EXCEL_MAX_COLUMNS)
    throw new Error(`Sheet "${sheet.name ?? ""}" has ${columnCount} columns; Excel allows ${EXCEL_MAX_COLUMNS}.`);
  const header = sheet.header ?? true;
  const widths = Array.from({ length: columnCount }, () => 0);
  const rowXml = [];
  rows.forEach((row, rowIndex) => {
    const cells = [];
    row.forEach((value, columnIndexZero) => {
      widths[columnIndexZero] = Math.max(widths[columnIndexZero], displayWidth(value));
      const xml2 = cellXml(`${columnLetters(columnIndexZero + 1)}${rowIndex + 1}`, value, header && rowIndex === 0 ? 1 : 0);
      if (xml2)
        cells.push(xml2);
    });
    if (cells.length)
      rowXml.push(`<row r="${rowIndex + 1}">${cells.join("")}</row>`);
  });
  const dimension = rows.length && columnCount ? `A1:${columnLetters(columnCount)}${rows.length}` : "A1";
  const cols = columnCount ? `<cols>${widths.map((width, index) => `<col min="${index + 1}" max="${index + 1}" width="${Math.min(60, Math.max(8, width + 2))}" customWidth="1"/>`).join("")}</cols>` : "";
  const xml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><dimension ref="${dimension}"/><sheetViews><sheetView workbookViewId="0"${header && rows.length > 1 ? `><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView>` : "/>"}</sheetViews><sheetFormatPr defaultRowHeight="15"/>${cols}<sheetData>${rowXml.join("")}</sheetData><pageMargins left="0.7" right="0.7" top="0.75" bottom="0.75" header="0.3" footer="0.3"/></worksheet>`;
  const size = utf8ByteLength(xml);
  if (size > MAX_ENTRY_UNCOMPRESSED_BYTES) {
    throw new Error(`Sheet ${JSON.stringify(sheet.name ?? "")} would be ${size} bytes of worksheet XML; the limit is ${MAX_ENTRY_UNCOMPRESSED_BYTES} bytes (roughly 30,000 text cells). Split the rows across sheets or files, shorten cell text, or write a CSV instead.`);
  }
  return { xml, rows: rows.length, columns: columnCount };
}
var STYLES_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts><fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`;
async function writeXlsxWorkbook(input) {
  if (input.length === 0)
    throw new Error("A workbook needs at least one sheet.");
  if (input.length > XLSX_WRITE_MAX_SHEETS)
    throw new Error(`A workbook may contain at most ${XLSX_WRITE_MAX_SHEETS} sheets.`);
  const totalCells = input.reduce((sum, sheet) => sum + sheet.rows.reduce((rowSum, row) => rowSum + row.length, 0), 0);
  if (totalCells > XLSX_WRITE_MAX_CELLS)
    throw new Error(`Workbook has ${totalCells} cells; spreadsheet_write accepts at most ${XLSX_WRITE_MAX_CELLS}. Split the data across files or write a CSV.`);
  const taken = new Set;
  const sheets = input.map((sheet, index) => ({ ...sheet, name: sanitizeSheetName(sheet.name, index + 1, taken) }));
  const worksheets = sheets.map((sheet) => worksheetXml(sheet));
  const files = [
    {
      name: "[Content_Types].xml",
      data: utf8Bytes(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>${sheets.map((_sheet, index) => `<Override PartName="/xl/worksheets/sheet${index + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join("")}</Types>`)
    },
    {
      name: "_rels/.rels",
      data: utf8Bytes(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`)
    },
    {
      name: "xl/workbook.xml",
      data: utf8Bytes(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><bookViews><workbookView/></bookViews><sheets>${sheets.map((sheet, index) => `<sheet name="${escapeXml(sheet.name)}" sheetId="${index + 1}" r:id="rId${index + 1}"/>`).join("")}</sheets><calcPr fullCalcOnLoad="1"/></workbook>`)
    },
    {
      name: "xl/_rels/workbook.xml.rels",
      data: utf8Bytes(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${sheets.map((_sheet, index) => `<Relationship Id="rId${index + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${index + 1}.xml"/>`).join("")}<Relationship Id="rId${sheets.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`)
    },
    { name: "xl/styles.xml", data: utf8Bytes(STYLES_XML) },
    ...worksheets.map((worksheet, index) => ({ name: `xl/worksheets/sheet${index + 1}.xml`, data: utf8Bytes(worksheet.xml) }))
  ];
  return {
    bytes: await buildZip(files),
    sheets: sheets.map((sheet, index) => ({ name: sheet.name, rows: worksheets[index].rows, columns: worksheets[index].columns }))
  };
}
// ../../packages/workbook/src/office-text.ts
var DOCX_MIME = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
var PPTX_MIME = "application/vnd.openxmlformats-officedocument.presentationml.presentation";
var XLSX_MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
var MAX_OFFICE_TEXT_CHARS = 24000;
var GENERIC_MIME = "application/octet-stream";
var MAX_XLSX_PREVIEW_CELLS = 1200;
var MAX_XLSX_PREVIEW_ROWS_PER_SHEET = 25;
var MAX_XLSX_PREVIEW_COLUMNS = 16;
var MAX_XLSX_PREVIEW_CELL_CHARS = 60;
function extensionOf(filename) {
  const name = (filename.split(/[\\/]/).pop() ?? "").toLowerCase();
  const dot = name.lastIndexOf(".");
  return dot > 0 ? name.slice(dot + 1) : "";
}
function officeKindFromMimeOrFilename(mime, filename) {
  if (mime === DOCX_MIME)
    return "docx";
  if (mime === PPTX_MIME)
    return "pptx";
  if (mime === XLSX_MIME)
    return "xlsx";
  if (mime !== "" && mime !== GENERIC_MIME)
    return null;
  const extension = extensionOf(filename);
  if (extension === "docx")
    return "docx";
  if (extension === "pptx")
    return "pptx";
  if (extension === "xlsx")
    return "xlsx";
  return null;
}
function relevantXmlEntry(kind, name) {
  if (!name.endsWith(".xml"))
    return false;
  if (kind === "docx") {
    return name === "word/document.xml" || /^word\/header\d+\.xml$/.test(name) || /^word\/footer\d+\.xml$/.test(name) || name === "word/footnotes.xml" || name === "word/endnotes.xml" || name === "word/comments.xml";
  }
  return /^ppt\/slides\/slide\d+\.xml$/.test(name) || /^ppt\/notesSlides\/notesSlide\d+\.xml$/.test(name);
}
function compareEntryName(left, right) {
  return left.name.localeCompare(right.name, undefined, { numeric: true, sensitivity: "base" });
}
function quoted(value) {
  const encoded = JSON.stringify(value.length > 500 ? `${value.slice(0, 500)}…` : value);
  return typeof encoded === "string" ? encoded : '""';
}
function sheetSummaryLine(sheet, total) {
  const facts = [
    sheet.dimension ? `dimension ${sheet.dimension}` : "",
    sheet.cells.length ? `${sheet.cells.length} cells in rows ${sheet.firstRow}-${sheet.lastRow}, columns ${columnLetters(sheet.firstColumn)}-${columnLetters(sheet.lastColumn)}` : "no cell values",
    sheet.formulaCount ? `${sheet.formulaCount} formula${sheet.formulaCount === 1 ? "" : "s"}` : "",
    sheet.mergedRanges.length ? `merged ${sheet.mergedRanges.slice(0, 8).join(", ")}${sheet.mergedRanges.length > 8 ? ", …" : ""}` : "",
    sheet.info.hidden ? "hidden" : ""
  ].filter(Boolean);
  return `sheet ${quoted(sheet.info.name)} (${sheet.info.position} of ${total}): ${facts.join("; ")}`;
}
async function extractXlsxText(bytes, options) {
  const tool = options.spreadsheetReadTool;
  const workbook = await openXlsxWorkbook(bytes);
  const total = workbook.sheets.length;
  const lines = [
    "xlsx_workbook:",
    `  sheet_count: ${total}`,
    `  sheet_names: ${workbook.sheets.map((sheet) => quoted(sheet.name)).join(", ")}`,
    `  shared_string_count: ${workbook.sharedStringCount}`,
    `  style_count: ${workbook.styleCount}`,
    ...workbook.date1904 ? ["  date_system: 1904"] : [],
    ...workbook.omittedSheets ? [`  omitted_sheets: ${workbook.omittedSheets} beyond the first ${total} are not shown`] : []
  ];
  let remainingCells = MAX_XLSX_PREVIEW_CELLS;
  for (const info of workbook.sheets) {
    let sheet;
    try {
      sheet = await workbook.readSheet(info);
    } catch (cause) {
      lines.push(`sheet ${quoted(info.name)} (${info.position} of ${total}): error: ${cause instanceof Error ? cause.message : String(cause)}`);
      continue;
    }
    lines.push(sheetSummaryLine(sheet, total));
    if (sheet.cells.length === 0)
      continue;
    if (remainingCells <= 0) {
      lines.push(tool ? `  preview omitted: cell budget used by earlier sheets; read it with ${tool}.` : "  preview omitted: cell budget used by earlier sheets.");
      continue;
    }
    const maxRows = Math.max(1, Math.min(MAX_XLSX_PREVIEW_ROWS_PER_SHEET, Math.floor(remainingCells / Math.min(MAX_XLSX_PREVIEW_COLUMNS, Math.max(1, sheet.lastColumn - sheet.firstColumn + 1)))));
    const table = renderSheetTable(sheet, { maxRows, maxColumns: MAX_XLSX_PREVIEW_COLUMNS, maxCellChars: MAX_XLSX_PREVIEW_CELL_CHARS });
    remainingCells -= table.renderedRows * table.columns.length;
    lines.push(table.text);
    if (table.truncatedColumns > 0)
      lines.push(`  more_columns: ${table.truncatedColumns} not shown`);
    if (table.nextStartRow !== null) {
      lines.push(tool ? `  more_rows: continue with ${tool}(sheet: ${quoted(sheet.info.name)}, startRow: ${table.nextStartRow})` : `  more_rows: rows from ${table.nextStartRow} are not shown`);
    }
    if (sheet.omittedCells > 0)
      lines.push(`  omitted_cells: ${sheet.omittedCells}`);
    const formulas = formulaSummary(sheet, 12);
    if (formulas.length)
      lines.push(`  formulas: ${formulas.join("; ")}${sheet.formulaCount > formulas.length ? `; … ${sheet.formulaCount - formulas.length} more` : ""}`);
    const formats = numberFormatSummary(sheet);
    if (formats.length)
      lines.push(`  number_formats: ${formats.join("; ")}`);
  }
  return lines.join(`
`).slice(0, MAX_OFFICE_TEXT_CHARS);
}
async function extractOfficeText(kind, bytes, options = {}) {
  if (kind === "xlsx")
    return await extractXlsxText(bytes, options);
  const entries = listZipEntries(bytes).filter((entry) => relevantXmlEntry(kind, entry.name)).sort(compareEntryName);
  if (entries.length === 0)
    throw new Error("No supported Office XML text entries were found.");
  const pieces = [];
  let remaining = MAX_OFFICE_TEXT_CHARS;
  for (const entry of entries) {
    if (remaining <= 0)
      break;
    const text = xmlText(utf8Text(await readZipEntryData(bytes, entry)));
    if (!text)
      continue;
    const chunk = text.slice(0, remaining);
    pieces.push(`[${entry.name}]
${chunk}`);
    remaining -= chunk.length;
  }
  const combined = pieces.join(`

`).slice(0, MAX_OFFICE_TEXT_CHARS);
  if (!combined)
    throw new Error("Office XML text entries contained no extractable text.");
  return combined;
}
// src/opencode-plugins/workspace-file-identity.ts
import { constants } from "node:fs";
import { lstat, open, realpath, rm } from "node:fs/promises";
import { dirname, isAbsolute, relative } from "node:path";
var NO_FOLLOW = constants.O_NOFOLLOW ?? 0;

class WorkspaceFileError extends Error {
  code;
  constructor(code, message) {
    super(message);
    this.code = code;
  }
}
function sameFile(left, right) {
  return left.dev === right.dev && left.ino === right.ino;
}
function isWithin(root, candidate) {
  const rel = relative(root, candidate);
  return rel === "" || !rel.startsWith("..") && !isAbsolute(rel);
}
async function proveHandleInPlace(actual, path, realRoot) {
  if (!actual.isFile() || !isWithin(realRoot, path))
    return false;
  const folder = dirname(path);
  const [placed, placedReal, folderNow, folderReal] = await Promise.all([
    lstat(path).catch(() => null),
    realpath(path).catch(() => null),
    lstat(folder).catch(() => null),
    realpath(folder).catch(() => null)
  ]);
  return placed !== null && sameFile(placed, actual) && placedReal === path && folderNow !== null && folderNow.isDirectory() && folderReal === folder;
}
function errorCode(error) {
  return typeof error === "object" && error !== null && "code" in error && typeof error.code === "string" ? error.code : "";
}
async function refuseLinkedFolder(path, label, missingCode) {
  const folder = dirname(path);
  const folderReal = await realpath(folder).catch(() => null);
  if (folderReal === null) {
    throw new WorkspaceFileError(missingCode, missingCode === "missing" ? `${label} was not found in the workspace.` : `${label}: its folder does not exist.`);
  }
  if (folderReal !== folder)
    throw new WorkspaceFileError("link", `${label} passes through a symbolic link, which is not allowed.`);
}
async function openWorkspaceFileForReading(realRoot, path, label) {
  await refuseLinkedFolder(path, label, "missing");
  let handle;
  try {
    handle = await open(path, constants.O_RDONLY | NO_FOLLOW);
  } catch (error) {
    const code = errorCode(error);
    if (code === "ENOENT" || code === "ENOTDIR")
      throw new WorkspaceFileError("missing", `${label} was not found in the workspace.`);
    if (code === "ELOOP" || code === "EMLINK")
      throw new WorkspaceFileError("link", `${label} passes through a symbolic link, which is not allowed.`);
    throw error;
  }
  try {
    const info = await handle.stat();
    if (!info.isFile())
      throw new WorkspaceFileError("not-file", `${label} is not a regular file.`);
    if (!await proveHandleInPlace(info, path, realRoot)) {
      const real = await realpath(path).catch(() => null);
      if (real !== null && real !== path)
        throw new WorkspaceFileError("link", `${label} passes through a symbolic link, which is not allowed.`);
      throw new WorkspaceFileError("changed", `${label} changed on disk while it was being opened; nothing was read. Try again.`);
    }
    return { handle, info, created: false };
  } catch (error) {
    await handle.close();
    throw error;
  }
}
async function openWorkspaceFileForWriting(realRoot, path, expected, label) {
  await refuseLinkedFolder(path, label, "folder-missing");
  let handle;
  try {
    handle = expected ? await open(path, constants.O_WRONLY | NO_FOLLOW) : await open(path, constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | NO_FOLLOW, 420);
  } catch (error) {
    const code = errorCode(error);
    if (code === "ENOENT" || code === "ENOTDIR")
      throw new WorkspaceFileError("folder-missing", `${label}: its folder does not exist.`);
    if (code === "EEXIST")
      throw new WorkspaceFileError("exists", `${label} appeared on disk while it was being created; nothing was written. Try again.`);
    if (code === "ELOOP" || code === "EMLINK")
      throw new WorkspaceFileError("link", `${label} passes through a symbolic link, which is not allowed.`);
    throw error;
  }
  try {
    const info = await handle.stat();
    const inPlace = await proveHandleInPlace(info, path, realRoot) && (expected === null || sameFile(info, expected));
    if (!inPlace) {
      const real = await realpath(path).catch(() => null);
      if (expected === null) {
        const placed = await lstat(path).catch(() => null);
        if (placed && sameFile(placed, info))
          await rm(path, { force: true }).catch(() => {
            return;
          });
      }
      if (real !== null && real !== path)
        throw new WorkspaceFileError("link", `${label} passes through a symbolic link, which is not allowed.`);
      throw new WorkspaceFileError("changed", `${label} changed on disk while it was being opened; nothing was written. Try again.`);
    }
    return { handle, info, created: expected === null };
  } catch (error) {
    await handle.close();
    throw error;
  }
}

// src/opencode-plugins/openwork-office-attachments.ts
var MATERIALIZED_DIR = join(".opencode", "openwork", "inbox", "chat-attachments");
function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function optionalStringProperty(value, key) {
  if (!isRecord(value))
    return;
  const property = value[key];
  return typeof property === "string" && property.trim().length > 0 ? property : undefined;
}
function normalizeOpenCodeContext(value) {
  const directory = optionalStringProperty(value, "directory");
  return {
    ...directory ? { directory } : {}
  };
}
function workspaceRoot(factoryContext) {
  return factoryContext.directory ? resolve(factoryContext.directory) : null;
}
function sha256(buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}
function normalizedMime(value) {
  return typeof value === "string" ? value.trim().toLowerCase().split(";")[0]?.trim() ?? "" : "";
}
function extensionFromFilename(filename) {
  const name = basename(filename).toLowerCase();
  const dot = name.lastIndexOf(".");
  return dot > 0 ? name.slice(dot + 1) : "";
}
function canonicalMime(kind) {
  if (kind === "docx")
    return DOCX_MIME;
  if (kind === "pptx")
    return PPTX_MIME;
  return XLSX_MIME;
}
function officeFilePart(value) {
  if (!isRecord(value) || value.type !== "file")
    return null;
  const url = optionalStringProperty(value, "url");
  if (!url)
    return null;
  const filename = optionalStringProperty(value, "filename") ?? optionalStringProperty(value, "name") ?? "attachment";
  const mime = normalizedMime(value.mediaType ?? value.mime ?? value.mimeType);
  const kind = officeKindFromMimeOrFilename(mime, filename);
  if (!kind)
    return null;
  return { filename, mime: canonicalMime(kind), url, kind, part: value };
}
function safeFilename(filename, kind) {
  const extension = kind;
  const clean = basename(filename).replace(/[\u0000-\u001f\u007f]/g, "").replace(/[^A-Za-z0-9._ -]+/g, "_").replace(/^\.+/, "").trim().slice(0, 120);
  const base = clean || `attachment.${extension}`;
  const currentExtension = extensionFromFilename(base);
  const rawStem = currentExtension ? base.slice(0, -(currentExtension.length + 1)) : base;
  const stem = rawStem.replace(/\.+$/, "").trim() || "attachment";
  return `${stem.slice(0, 120 - extension.length - 1)}.${extension}`;
}
function isWithin2(root, candidate) {
  const rel = relative2(root, candidate);
  return rel === "" || !rel.startsWith("..") && !isAbsolute2(rel);
}
function toWorkerRelativePath(root, path) {
  return relative2(root, path).split(sep).join("/");
}
function base64Value(code) {
  if (code >= 65 && code <= 90)
    return code - 65;
  if (code >= 97 && code <= 122)
    return code - 71;
  if (code >= 48 && code <= 57)
    return code + 4;
  if (code === 43)
    return 62;
  if (code === 47)
    return 63;
  return -1;
}
function isValidBase64(value) {
  if (value.length === 0 || value.length % 4 !== 0)
    return false;
  let padding = 0;
  if (value.endsWith("=="))
    padding = 2;
  else if (value.endsWith("="))
    padding = 1;
  const dataEnd = value.length - padding;
  for (let index = 0;index < dataEnd; index += 1) {
    if (base64Value(value.charCodeAt(index)) < 0)
      return false;
  }
  for (let index = dataEnd;index < value.length; index += 1) {
    if (value[index] !== "=")
      return false;
  }
  if (padding === 1)
    return (base64Value(value.charCodeAt(value.length - 2)) & 3) === 0;
  if (padding === 2)
    return (base64Value(value.charCodeAt(value.length - 3)) & 15) === 0;
  return true;
}
function decodeDataUrl(url) {
  const match = /^data:([^;,]+)?(?:;[^,]*)?;base64,([A-Za-z0-9+/=\s]+)$/i.exec(url);
  if (!match)
    throw new Error("Only base64 data URLs are supported for Office attachments.");
  const encoded = match[2].replace(/\s+/g, "");
  if (encoded.length > Math.ceil(MAX_COMPRESSED_BYTES / 3) * 4 + 8)
    throw new Error("Office attachment data URL exceeds the compressed byte limit.");
  if (!isValidBase64(encoded))
    throw new Error("Office attachment data URL is not valid base64.");
  const buffer = Buffer.from(encoded, "base64");
  if (buffer.byteLength > MAX_COMPRESSED_BYTES)
    throw new Error("Office attachment exceeds the compressed byte limit.");
  return buffer;
}
async function readWorkspaceFile(realRoot, path, label) {
  if (!isWithin2(realRoot, path))
    throw new Error(`${label} points outside the active workspace.`);
  const { handle, info } = await openWorkspaceFileForReading(realRoot, path, label);
  try {
    if (info.size > MAX_COMPRESSED_BYTES)
      throw new Error("Office attachment exceeds the compressed byte limit.");
    return await handle.readFile();
  } finally {
    await handle.close();
  }
}
async function bytesFromPart(part, root) {
  if (part.url.startsWith("data:"))
    return decodeDataUrl(part.url);
  const url = new URL(part.url);
  if (url.protocol !== "file:")
    throw new Error("Office attachment URL was not a supported data: or workspace file: URL.");
  if (!root)
    throw new Error("Workspace root is unavailable for file: Office attachment URLs.");
  const realRoot = await realpath2(root);
  const filePath = resolve(realRoot, relative2(root, resolve(fileURLToPath(url))));
  return await readWorkspaceFile(realRoot, filePath, "Office attachment file URL");
}
async function ensureMaterializedDirectory(realRoot) {
  let current = realRoot;
  for (const segment of MATERIALIZED_DIR.split(sep)) {
    current = join(current, segment);
    let info = await lstat2(current).catch(() => null);
    if (info === null) {
      await mkdir(current).catch(() => {
        return;
      });
      info = await lstat2(current);
    }
    if (info.isSymbolicLink())
      throw new Error(`Office attachment folder ${toWorkerRelativePath(realRoot, current)} is a symbolic link, which is not allowed.`);
    if (!info.isDirectory())
      throw new Error(`Office attachment folder ${toWorkerRelativePath(realRoot, current)} is not a directory.`);
  }
  const real = await realpath2(current);
  if (real !== current)
    throw new Error("Office attachment folder passes through a symbolic link, which is not allowed.");
  return current;
}
async function existingDigest(realRoot, path) {
  try {
    return sha256(await readWorkspaceFile(realRoot, path, "Materialized Office attachment"));
  } catch {
    return null;
  }
}
async function writeMaterializedFile(realRoot, target, bytes) {
  const { handle } = await openWorkspaceFileForWriting(realRoot, target, null, "Materialized Office attachment");
  try {
    await handle.writeFile(bytes);
    await handle.sync();
  } finally {
    await handle.close();
  }
}
async function materializeAttachment(root, filename, kind, bytes) {
  if (!root)
    return null;
  const digest = sha256(bytes);
  const realRoot = await realpath2(root);
  const directory = await ensureMaterializedDirectory(realRoot);
  const names = [`${digest.slice(0, 16)}-${safeFilename(filename, kind)}`, `${digest}-${safeFilename(filename, kind)}`];
  for (const name of names) {
    const target = join(directory, name);
    const current = await existingDigest(realRoot, target);
    if (current === digest)
      return { sha256: digest, relativePath: toWorkerRelativePath(realRoot, target) };
    if (current !== null)
      continue;
    try {
      await writeMaterializedFile(realRoot, target, bytes);
      return { sha256: digest, relativePath: toWorkerRelativePath(realRoot, target) };
    } catch (cause) {
      const afterRace = await existingDigest(realRoot, target);
      if (afterRace === digest)
        return { sha256: digest, relativePath: toWorkerRelativePath(realRoot, target) };
      if (afterRace !== null)
        continue;
      throw cause;
    }
  }
  throw new Error("A different Office attachment already exists at the materialized path.");
}
function basePartIds(part) {
  const result = {};
  for (const key of ["id", "sessionID", "messageID", "sessionId", "messageId"]) {
    const value = part[key];
    if (typeof value === "string" || typeof value === "number")
      result[key] = value;
  }
  return result;
}
function normalizedText(part, materialized, extractedText, error) {
  return [
    "OpenWork normalized an Office attachment before sending this request to the model.",
    `filename: ${safeFilename(part.filename, part.kind)}`,
    `canonical_mime: ${part.mime}`,
    `sha256: ${materialized?.sha256 ?? "unavailable"}`,
    `worker_relative_path: ${materialized?.relativePath ?? "unavailable"}`,
    ...error ? [`extraction_error: ${error}`] : [],
    ...part.kind === "xlsx" && materialized ? [`next_step: the read tool cannot open .xlsx; use spreadsheet_inspect and spreadsheet_read with path ${JSON.stringify(materialized.relativePath)} for every sheet, range, and row beyond this preview.`] : [],
    "extracted_text:",
    extractedText
  ].join(`
`);
}
function textPartFrom(part, text) {
  return { ...basePartIds(part.part), type: "text", text };
}
async function normalizeOfficePart(part, root) {
  try {
    const bytes = await bytesFromPart(part, root);
    const materialized = await materializeAttachment(root, part.filename, part.kind, bytes);
    try {
      const extractedText = await extractOfficeText(part.kind, bytes, { spreadsheetReadTool: "spreadsheet_read" });
      return textPartFrom(part, normalizedText(part, materialized, extractedText));
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : String(cause);
      return textPartFrom(part, normalizedText(part, materialized, "No text could be safely extracted from this Office attachment.", message));
    }
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : String(cause);
    return textPartFrom(part, normalizedText(part, null, "The original Office attachment was not forwarded to the provider.", message));
  }
}
async function transformPart(value, root) {
  const part = officeFilePart(value);
  return part ? await normalizeOfficePart(part, root) : value;
}
async function transformMessage(value, root) {
  if (!isRecord(value))
    return value;
  if (Array.isArray(value.parts))
    return { ...value, parts: await Promise.all(value.parts.map((part) => transformPart(part, root))) };
  if (Array.isArray(value.content))
    return { ...value, content: await Promise.all(value.content.map((part) => transformPart(part, root))) };
  return value;
}
var OpenWorkOfficeAttachments = async (factoryInput) => {
  const factoryContext = normalizeOpenCodeContext(factoryInput);
  return {
    "experimental.chat.messages.transform": async (input, output) => {
      const root = workspaceRoot(factoryContext);
      const messages = await Promise.all(output.messages.map((message) => transformMessage(message, root)));
      output.messages.splice(0, output.messages.length, ...messages);
    }
  };
};
export {
  OpenWorkOfficeAttachments
};
