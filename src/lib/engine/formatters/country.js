// Bundled ISO 3166-1 list: alpha-2 | alpha-3 | dial code | name | common alternates (comma separated).
import { isPlaceholderOption, matchOption } from './options.js';

const RAW = `AF|AFG|93|Afghanistan|
AX|ALA|358|Åland Islands|Aland Islands
AL|ALB|355|Albania|
DZ|DZA|213|Algeria|
AS|ASM|1|American Samoa|
AD|AND|376|Andorra|
AO|AGO|244|Angola|
AI|AIA|1|Anguilla|
AQ|ATA|672|Antarctica|
AG|ATG|1|Antigua and Barbuda|
AR|ARG|54|Argentina|
AM|ARM|374|Armenia|
AW|ABW|297|Aruba|
AU|AUS|61|Australia|
AT|AUT|43|Austria|
AZ|AZE|994|Azerbaijan|
BS|BHS|1|Bahamas|The Bahamas
BH|BHR|973|Bahrain|
BD|BGD|880|Bangladesh|
BB|BRB|1|Barbados|
BY|BLR|375|Belarus|
BE|BEL|32|Belgium|
BZ|BLZ|501|Belize|
BJ|BEN|229|Benin|
BM|BMU|1|Bermuda|
BT|BTN|975|Bhutan|
BO|BOL|591|Bolivia|Plurinational State of Bolivia
BQ|BES|599|Bonaire, Sint Eustatius and Saba|Caribbean Netherlands
BA|BIH|387|Bosnia and Herzegovina|
BW|BWA|267|Botswana|
BV|BVT|47|Bouvet Island|
BR|BRA|55|Brazil|Brasil
IO|IOT|246|British Indian Ocean Territory|
BN|BRN|673|Brunei Darussalam|Brunei
BG|BGR|359|Bulgaria|
BF|BFA|226|Burkina Faso|
BI|BDI|257|Burundi|
CV|CPV|238|Cabo Verde|Cape Verde
KH|KHM|855|Cambodia|
CM|CMR|237|Cameroon|
CA|CAN|1|Canada|
KY|CYM|1|Cayman Islands|
CF|CAF|236|Central African Republic|
TD|TCD|235|Chad|
CL|CHL|56|Chile|
CN|CHN|86|China|People's Republic of China,PRC
CX|CXR|61|Christmas Island|
CC|CCK|61|Cocos (Keeling) Islands|Cocos Islands
CO|COL|57|Colombia|
KM|COM|269|Comoros|
CG|COG|242|Congo|Republic of the Congo,Congo-Brazzaville
CD|COD|243|Congo, Democratic Republic of the|DR Congo,DRC,Democratic Republic of the Congo
CK|COK|682|Cook Islands|
CR|CRI|506|Costa Rica|
CI|CIV|225|Côte d'Ivoire|Cote d'Ivoire,Ivory Coast
HR|HRV|385|Croatia|
CU|CUB|53|Cuba|
CW|CUW|599|Curaçao|Curacao
CY|CYP|357|Cyprus|
CZ|CZE|420|Czechia|Czech Republic
DK|DNK|45|Denmark|
DJ|DJI|253|Djibouti|
DM|DMA|1|Dominica|
DO|DOM|1|Dominican Republic|
EC|ECU|593|Ecuador|
EG|EGY|20|Egypt|
SV|SLV|503|El Salvador|
GQ|GNQ|240|Equatorial Guinea|
ER|ERI|291|Eritrea|
EE|EST|372|Estonia|
SZ|SWZ|268|Eswatini|Swaziland
ET|ETH|251|Ethiopia|
FK|FLK|500|Falkland Islands|Falkland Islands (Malvinas)
FO|FRO|298|Faroe Islands|
FJ|FJI|679|Fiji|
FI|FIN|358|Finland|
FR|FRA|33|France|
GF|GUF|594|French Guiana|
PF|PYF|689|French Polynesia|
TF|ATF|262|French Southern Territories|
GA|GAB|241|Gabon|
GM|GMB|220|Gambia|The Gambia
GE|GEO|995|Georgia|
DE|DEU|49|Germany|Deutschland
GH|GHA|233|Ghana|
GI|GIB|350|Gibraltar|
GR|GRC|30|Greece|
GL|GRL|299|Greenland|
GD|GRD|1|Grenada|
GP|GLP|590|Guadeloupe|
GU|GUM|1|Guam|
GT|GTM|502|Guatemala|
GG|GGY|44|Guernsey|
GN|GIN|224|Guinea|
GW|GNB|245|Guinea-Bissau|
GY|GUY|592|Guyana|
HT|HTI|509|Haiti|
HM|HMD|672|Heard Island and McDonald Islands|
VA|VAT|39|Holy See|Vatican City,Vatican
HN|HND|504|Honduras|
HK|HKG|852|Hong Kong|Hong Kong SAR
HU|HUN|36|Hungary|
IS|ISL|354|Iceland|
IN|IND|91|India|Bharat,Republic of India,Hindustan
ID|IDN|62|Indonesia|
IR|IRN|98|Iran|Islamic Republic of Iran
IQ|IRQ|964|Iraq|
IE|IRL|353|Ireland|Republic of Ireland
IM|IMN|44|Isle of Man|
IL|ISR|972|Israel|
IT|ITA|39|Italy|
JM|JAM|1|Jamaica|
JP|JPN|81|Japan|
JE|JEY|44|Jersey|
JO|JOR|962|Jordan|
KZ|KAZ|7|Kazakhstan|
KE|KEN|254|Kenya|
KI|KIR|686|Kiribati|
KP|PRK|850|North Korea|Korea (Democratic People's Republic of),DPRK
KR|KOR|82|South Korea|Korea,Korea (Republic of),Republic of Korea
KW|KWT|965|Kuwait|
KG|KGZ|996|Kyrgyzstan|
LA|LAO|856|Laos|Lao People's Democratic Republic
LV|LVA|371|Latvia|
LB|LBN|961|Lebanon|
LS|LSO|266|Lesotho|
LR|LBR|231|Liberia|
LY|LBY|218|Libya|
LI|LIE|423|Liechtenstein|
LT|LTU|370|Lithuania|
LU|LUX|352|Luxembourg|
MO|MAC|853|Macao|Macau
MG|MDG|261|Madagascar|
MW|MWI|265|Malawi|
MY|MYS|60|Malaysia|
MV|MDV|960|Maldives|
ML|MLI|223|Mali|
MT|MLT|356|Malta|
MH|MHL|692|Marshall Islands|
MQ|MTQ|596|Martinique|
MR|MRT|222|Mauritania|
MU|MUS|230|Mauritius|
YT|MYT|262|Mayotte|
MX|MEX|52|Mexico|
FM|FSM|691|Micronesia|Federated States of Micronesia
MD|MDA|373|Moldova|Republic of Moldova
MC|MCO|377|Monaco|
MN|MNG|976|Mongolia|
ME|MNE|382|Montenegro|
MS|MSR|1|Montserrat|
MA|MAR|212|Morocco|
MZ|MOZ|258|Mozambique|
MM|MMR|95|Myanmar|Burma
NA|NAM|264|Namibia|
NR|NRU|674|Nauru|
NP|NPL|977|Nepal|
NL|NLD|31|Netherlands|Holland,The Netherlands
NC|NCL|687|New Caledonia|
NZ|NZL|64|New Zealand|
NI|NIC|505|Nicaragua|
NE|NER|227|Niger|
NG|NGA|234|Nigeria|
NU|NIU|683|Niue|
NF|NFK|672|Norfolk Island|
MK|MKD|389|North Macedonia|Macedonia
MP|MNP|1|Northern Mariana Islands|
NO|NOR|47|Norway|
OM|OMN|968|Oman|
PK|PAK|92|Pakistan|
PW|PLW|680|Palau|
PS|PSE|970|Palestine|State of Palestine
PA|PAN|507|Panama|
PG|PNG|675|Papua New Guinea|
PY|PRY|595|Paraguay|
PE|PER|51|Peru|
PH|PHL|63|Philippines|
PN|PCN|64|Pitcairn|Pitcairn Islands
PL|POL|48|Poland|
PT|PRT|351|Portugal|
PR|PRI|1|Puerto Rico|
QA|QAT|974|Qatar|
RE|REU|262|Réunion|Reunion
RO|ROU|40|Romania|
RU|RUS|7|Russia|Russian Federation
RW|RWA|250|Rwanda|
BL|BLM|590|Saint Barthélemy|Saint Barthelemy
SH|SHN|290|Saint Helena, Ascension and Tristan da Cunha|Saint Helena
KN|KNA|1|Saint Kitts and Nevis|
LC|LCA|1|Saint Lucia|
MF|MAF|590|Saint Martin (French part)|Saint Martin
PM|SPM|508|Saint Pierre and Miquelon|
VC|VCT|1|Saint Vincent and the Grenadines|
WS|WSM|685|Samoa|
SM|SMR|378|San Marino|
ST|STP|239|Sao Tome and Principe|São Tomé and Príncipe
SA|SAU|966|Saudi Arabia|KSA
SN|SEN|221|Senegal|
RS|SRB|381|Serbia|
SC|SYC|248|Seychelles|
SL|SLE|232|Sierra Leone|
SG|SGP|65|Singapore|
SX|SXM|1|Sint Maarten (Dutch part)|Sint Maarten
SK|SVK|421|Slovakia|
SI|SVN|386|Slovenia|
SB|SLB|677|Solomon Islands|
SO|SOM|252|Somalia|
ZA|ZAF|27|South Africa|
GS|SGS|500|South Georgia and the South Sandwich Islands|
SS|SSD|211|South Sudan|
ES|ESP|34|Spain|España
LK|LKA|94|Sri Lanka|Ceylon
SD|SDN|249|Sudan|
SR|SUR|597|Suriname|
SJ|SJM|47|Svalbard and Jan Mayen|
SE|SWE|46|Sweden|
CH|CHE|41|Switzerland|
SY|SYR|963|Syria|Syrian Arab Republic
TW|TWN|886|Taiwan|
TJ|TJK|992|Tajikistan|
TZ|TZA|255|Tanzania|United Republic of Tanzania
TH|THA|66|Thailand|
TL|TLS|670|Timor-Leste|East Timor
TG|TGO|228|Togo|
TK|TKL|690|Tokelau|
TO|TON|676|Tonga|
TT|TTO|1|Trinidad and Tobago|
TN|TUN|216|Tunisia|
TR|TUR|90|Türkiye|Turkey,Turkiye
TM|TKM|993|Turkmenistan|
TC|TCA|1|Turks and Caicos Islands|
TV|TUV|688|Tuvalu|
UG|UGA|256|Uganda|
UA|UKR|380|Ukraine|
AE|ARE|971|United Arab Emirates|UAE,Emirates
GB|GBR|44|United Kingdom|UK,Great Britain,Britain,England,United Kingdom of Great Britain and Northern Ireland
US|USA|1|United States|USA,US,United States of America,America
UM|UMI|1|United States Minor Outlying Islands|
UY|URY|598|Uruguay|
UZ|UZB|998|Uzbekistan|
VU|VUT|678|Vanuatu|
VE|VEN|58|Venezuela|
VN|VNM|84|Viet Nam|Vietnam
VG|VGB|1|British Virgin Islands|Virgin Islands (British)
VI|VIR|1|U.S. Virgin Islands|Virgin Islands (U.S.)
WF|WLF|681|Wallis and Futuna|
EH|ESH|212|Western Sahara|
YE|YEM|967|Yemen|
ZM|ZMB|260|Zambia|
ZW|ZWE|263|Zimbabwe|`;

/** @type {{ alpha2: string, alpha3: string, dial: string, name: string, alternates: string[] }[]} */
export const COUNTRIES = RAW.split('\n').map((line) => {
  const [alpha2, alpha3, dial, name, alt] = line.split('|');
  return { alpha2, alpha3, dial, name, alternates: alt ? alt.split(',') : [] };
});

const lc = (s) => String(s ?? '').trim().toLowerCase();

/** Finds a country by name, alternate name, alpha-2 or alpha-3 code. */
export function findCountry(value) {
  const v = lc(value);
  if (!v) return null;
  return (
    COUNTRIES.find((c) => lc(c.name) === v || c.alternates.some((a) => lc(a) === v)) ??
    COUNTRIES.find((c) => lc(c.alpha2) === v || lc(c.alpha3) === v) ??
    null
  );
}

/** Every way an option might spell this country. */
export const countryCandidates = (value) => {
  const c = findCountry(value);
  return c ? [c.name, ...c.alternates, c.alpha2, c.alpha3] : [value];
};

/** Option index for a country in a select / radio / combobox, or -1. */
export function matchCountry(options, value) {
  const c = findCountry(value);
  if (!c) return matchOption(options, value);
  const names = [c.name, ...c.alternates].map(lc);
  const codes = [c.alpha2, c.alpha3].map(lc);
  const i = options.findIndex(
    (o) => !isPlaceholderOption(o.text) && (names.includes(lc(o.text)) || codes.includes(lc(o.value)) || codes.includes(lc(o.text))),
  );
  if (i >= 0) return i;
  for (const n of [c.name, ...c.alternates]) {
    const j = matchOption(options, n);
    if (j >= 0) return j;
  }
  return -1;
}

/** Dial code digits ("91") for a "+91" / "91" / "India" value. */
export function dialDigits(value) {
  const digits = String(value ?? '').replace(/\D/g, '');
  return digits || findCountry(value)?.dial || '';
}

/** Option index for a phone country-code select: "+91", "91", "India (+91)", "IN +91"… */
export function matchDialCode(options, codeValue, countryValue) {
  const d = dialDigits(codeValue);
  if (!d) return -1;
  const re = new RegExp(`(^|[^\\d])\\+?${d}($|[^\\d])`);
  const hits = options
    .map((o, i) => ({ o, i }))
    .filter(({ o }) => !isPlaceholderOption(o.text) && (re.test(o.text) || re.test(o.value)));
  if (hits.length <= 1) return hits[0]?.i ?? -1;
  // Several countries share a code (+1, +44, +7): prefer the user's country.
  const c = findCountry(countryValue);
  const pick = c && hits.find(({ o }) => [c.name, c.alpha2, c.alpha3, ...c.alternates].some((n) => lc(o.text).includes(lc(n))));
  return (pick ?? hits[0]).i;
}
