// Synonyms per profile key. Aliases and negatives are written as plain text and
// normalised at load time, so they go through the same cleanup as page labels.
import { tokens } from './normalize.js';

const TEXT = ['text', 'textarea', 'contenteditable'];
const CHOICE = ['select', 'radio-group', 'aria-combobox'];
const NUM = ['text', 'number', 'tel'];

/**
 * @typedef {{ key: string, aliases: string[], negative?: string[], types: string[],
 *   autocomplete?: string[], inputTypes?: string[] }} DictEntry
 */

/** @type {DictEntry[]} */
export const RAW_DICTIONARY = [
  {
    key: 'fullName',
    aliases: ['full name', 'your name', 'name', 'visitor name', 'delegate name', 'participant name', 'attendee name',
      'applicant name', 'candidate name', 'student name', 'name of participant', 'name of applicant', 'name of attendee',
      'name of student', 'name of delegate', 'complete name', 'registrant name', 'person name', 'name in full',
      'full legal name', 'legal name', 'name as per id', 'first and last name', 'name surname', 'your full name'],
    negative: ['first', 'last', 'middle', 'company', 'college', 'organization', 'organisation', 'team', 'father',
      'mother', 'guardian', 'parent', 'event', 'institute', 'institution', 'school', 'nick', 'nickname', 'university',
      'startup', 'project', 'product', 'brand', 'business', 'file', 'user', 'account', 'bank', 'department', 'course',
      'degree', 'branch', 'spouse', 'emergency', 'reference', 'referrer', 'mentor', 'captain', 'leader', 'member',
      'friend', 'contact', 'given', 'family', 'surname', 'city', 'country', 'state', 'street', 'venue', 'hotel', 'manager', 'employer'],
    types: TEXT,
    autocomplete: ['name'],
  },
  {
    key: 'firstName',
    aliases: ['first name', 'given name', 'fname', 'forename', 'firstname', 'first'],
    negative: ['last', 'family', 'surname', 'father', 'mother', 'guardian', 'parent', 'middle', 'company', 'team'],
    types: TEXT,
    autocomplete: ['given-name'],
  },
  {
    key: 'lastName',
    aliases: ['last name', 'surname', 'family name', 'lname', 'lastname', 'last'],
    negative: ['first', 'given', 'father', 'mother', 'guardian', 'parent', 'middle', 'company', 'team'],
    types: TEXT,
    autocomplete: ['family-name'],
  },
  {
    key: 'salutation',
    aliases: ['title', 'salutation', 'prefix', 'honorific', 'mr ms', 'mr mrs ms'],
    negative: ['job', 'event', 'talk', 'session', 'paper', 'project', 'presentation', 'position', 'idea', 'book'],
    types: [...CHOICE, 'text'],
    autocomplete: ['honorific-prefix'],
  },
  {
    key: 'gender',
    aliases: ['gender', 'sex', 'gender identity', 'i identify as'],
    types: [...CHOICE, 'text'],
    autocomplete: ['sex'],
  },
  {
    key: 'email',
    aliases: ['email', 'e mail', 'email address', 'email id', 'mail id', 'mail', 'e mail id', 'e mail address', 'gmail',
      'contact email', 'personal email', 'official email', 'your email', 'confirm email', 're enter email'],
    negative: ['alternate', 'alternative', 'secondary', 'parent', 'guardian', 'father', 'mother', 'emergency',
      'manager', 'reference', 'referrer', 'friend', 'team', 'mentor'],
    types: ['email', 'text', 'contenteditable'],
    autocomplete: ['email'],
    inputTypes: ['email'],
  },
  {
    key: 'phone',
    aliases: ['mobile', 'mobile number', 'mobile no', 'mobile phone', 'contact number', 'contact no', 'phone',
      'phone number', 'phone no', 'telephone', 'telephone number', 'cell', 'cell phone', 'cell number', 'contact',
      'mob no', 'mobile num', 'primary mobile', 'primary phone', 'contact mobile', 'mobile contact', 'tel'],
    negative: ['whatsapp', 'alternate', 'alternative', 'emergency', 'parent', 'guardian', 'father', 'mother', 'office',
      'landline', 'secondary', 'reference', 'manager', 'email', 'mail', 'address', 'person', 'mentor'],
    types: ['tel', 'text', 'number'],
    autocomplete: ['tel', 'tel-national', 'mobile'],
    inputTypes: ['tel'],
  },
  {
    key: 'phoneCountryCode',
    aliases: ['country code', 'dial code', 'isd code', 'isd', 'calling code', 'phone code', 'mobile code',
      'country calling code', 'phone country code'],
    negative: ['mobile', 'number', 'contact', 'whatsapp', 'postal', 'zip', 'pin', 'promo', 'coupon', 'discount',
      'referral', 'invite', 'access', 'verification'],
    types: ['select', 'aria-combobox', 'text', 'tel', 'number'],
    autocomplete: ['tel-country-code'],
  },
  {
    key: 'whatsapp',
    aliases: ['whatsapp', 'whatsapp number', 'whatsapp no', 'whatsapp mobile', 'whatsapp contact', 'whats app',
      'whatsapp phone', 'wa number', 'whatsapp mobile number'],
    negative: ['same', 'parent', 'guardian', 'father', 'mother', 'group', 'link'],
    types: ['tel', 'text', 'number'],
  },
  {
    key: 'whatsappSameAsPhone',
    aliases: ['whatsapp same as', 'same as mobile', 'same as phone', 'same as contact', 'whatsapp same',
      'number on whatsapp', 'same number on whatsapp', 'mobile number on whatsapp'],
    types: ['checkbox-single', 'radio-group'],
  },
  {
    key: 'organization',
    aliases: ['company', 'company name', 'organisation', 'organization', 'employer', 'firm', 'startup', 'startup name',
      'organization name', 'organisation name', 'name of organization', 'name of organisation', 'name of company',
      'current company', 'current organization', 'current organisation', 'current employer', 'employer name',
      'workplace', 'business name', 'affiliation', 'org', 'company organisation', 'company organization'],
    negative: ['college', 'school', 'university', 'institute', 'institution', 'parent', 'father', 'mother', 'previous',
      'past', 'size', 'type', 'website', 'url', 'address', 'email', 'logo', 'stage', 'sector', 'industry', 'role'],
    types: [...TEXT, 'select', 'aria-combobox'],
    autocomplete: ['organization'],
  },
  {
    key: 'designation',
    aliases: ['designation', 'job title', 'position', 'role', 'title', 'occupation', 'current role',
      'current designation', 'job role', 'job position', 'your role', 'role in company', 'current position',
      'job designation', 'designation role'],
    negative: ['registration', 'category', 'ticket', 'pass', 'type', 'event', 'talk', 'session', 'paper', 'team',
      'project', 'presentation', 'applying', 'apply', 'preferred', 'idea', 'book', 'volunteer'],
    types: [...TEXT, ...CHOICE],
    autocomplete: ['organization-title'],
  },
  {
    key: 'department',
    aliases: ['department', 'dept', 'division', 'business unit', 'function', 'department name'],
    negative: ['college', 'study', 'academic'],
    types: [...TEXT, ...CHOICE],
  },
  {
    key: 'industry',
    aliases: ['industry', 'sector', 'industry type', 'field of work', 'vertical', 'business sector', 'industry sector'],
    types: [...TEXT, ...CHOICE],
  },
  {
    key: 'experienceYears',
    aliases: ['experience', 'years of experience', 'work experience', 'total experience', 'years experience',
      'professional experience', 'yrs of experience', 'experience in years', 'exp', 'industry experience',
      'total work experience'],
    negative: ['hackathon', 'event', 'programming', 'coding', 'previous event', 'describe', 'prior', 'language'],
    types: ['text', 'number', ...CHOICE],
  },
  {
    key: 'attendeeType',
    aliases: ['you are', 'i am a', 'i am', 'are you a', 'you are a', 'attendee type', 'participant type',
      'category of participant', 'profession', 'current status', 'participant category', 'attendee category',
      'visitor type', 'visitor category', 'registration category', 'registration type', 'delegate type',
      'professional status', 'who are you', 'occupation status', 'category', 'registration as', 'register as',
      'registering as', 'attending as', 'participating as', 'participate as', 'join as'],
    negative: ['product', 'ticket price', 'food', 'meal', 'track', 'interest'],
    types: CHOICE,
  },
  {
    key: 'course',
    aliases: ['course', 'program', 'programme', 'degree', 'branch', 'stream', 'specialization', 'specialisation',
      'major', 'course name', 'discipline', 'field of study', 'qualification', 'highest qualification',
      'degree program', 'course of study', 'current course', 'course branch', 'degree branch'],
    negative: ['year', 'duration', 'event', 'workshop', 'interest', 'preferred', 'track', 'online', 'certification'],
    types: [...TEXT, ...CHOICE],
  },
  {
    key: 'college',
    aliases: ['college', 'college name', 'institute', 'institution', 'university', 'school', 'institute name',
      'institution name', 'name of college', 'name of institute', 'name of institution', 'school name',
      'college university', 'college institute', 'institute university', 'educational institution', 'alma mater',
      'campus', 'college school', 'school college', 'name of school'],
    negative: ['company', 'employer', 'organization', 'organisation', 'city', 'location', 'address', 'id', 'roll', 'registration', 'enrollment',
      'enrolment', 'email', 'year', 'course', 'branch', 'state', 'website', 'pin', 'ambassador', 'affiliated'],
    types: [...TEXT, ...CHOICE],
  },
  {
    key: 'university',
    aliases: ['university', 'university name', 'affiliated university', 'name of university', 'affiliating university'],
    negative: ['company', 'employer', 'city', 'location', 'address', 'id', 'roll', 'registration', 'email', 'year'],
    types: [...TEXT, ...CHOICE],
  },
  {
    key: 'yearOfStudy',
    aliases: ['year of study', 'current year', 'which year', 'semester', 'sem', 'year', 'study year', 'academic year',
      'current semester', 'year in college', 'current year of study', 'year of course', 'class'],
    negative: ['graduation', 'graduating', 'passing', 'pass', 'birth', 'experience', 'batch', 'founded',
      'established', 'incorporation', 'expected'],
    types: [...CHOICE, 'text', 'number'],
  },
  {
    key: 'graduationYear',
    aliases: ['graduation year', 'passing year', 'year of passing', 'batch', 'year of graduation', 'expected graduation',
      'graduating year', 'grad year', 'passout year', 'pass out year', 'batch year', 'year of completion', 'class of',
      'expected year of graduation', 'graduation'],
    negative: ['birth', 'founded', 'established'],
    types: [...CHOICE, 'text', 'number'],
  },
  {
    key: 'country',
    aliases: ['country', 'country of residence', 'residing country', 'country name', 'current country',
      'country region', 'resident country'],
    negative: ['nationality', 'citizenship', 'code', 'dial', 'birth', 'origin', 'calling', 'isd', 'phone', 'mobile',
      'passport', 'issuing'],
    types: [...TEXT, ...CHOICE],
    autocomplete: ['country', 'country-name'],
  },
  {
    key: 'state',
    aliases: ['state', 'province', 'region', 'union territory', 'state ut', 'state province',
      'state union territory', 'state of residence', 'residing state', 'home state', 'state name'],
    negative: ['country', 'bank', 'birth', 'domicile'],
    types: [...TEXT, ...CHOICE],
    autocomplete: ['address-level1'],
  },
  {
    key: 'city',
    aliases: ['city', 'town', 'district', 'location', 'city town', 'current city', 'city of residence', 'residing city',
      'home city', 'place', 'city district', 'village', 'town city', 'base location', 'current location'],
    negative: ['college', 'venue', 'event', 'preferred', 'birth', 'country', 'state', 'pin', 'zip', 'postal', 'office',
      'job', 'work'],
    types: [...TEXT, ...CHOICE],
    autocomplete: ['address-level2'],
  },
  {
    key: 'postalCode',
    aliases: ['pin code', 'pincode', 'postal code', 'zip', 'zip code', 'postcode', 'post code', 'postal', 'zipcode',
      'area pin code', 'pin'],
    types: NUM,
    autocomplete: ['postal-code'],
  },
  {
    key: 'address',
    aliases: ['address', 'full address', 'residential address', 'postal address', 'street address', 'address line',
      'address line 1', 'current address', 'permanent address', 'communication address', 'mailing address',
      'house address', 'street', 'correspondence address', 'home address'],
    negative: ['email', 'e mail', 'ip', 'web', 'website', 'url', 'company', 'college', 'venue', 'wallet', 'office'],
    types: TEXT,
    autocomplete: ['street-address', 'address-line1'],
  },
  {
    key: 'linkedin',
    aliases: ['linkedin', 'linkedin profile', 'linkedin url', 'linkedin id', 'linkedin link', 'linked in',
      'linkedin handle', 'linkedin profile url', 'linkedin profile link'],
    negative: ['company'],
    types: ['url', 'text'],
  },
  {
    key: 'github',
    aliases: ['github', 'github profile', 'github url', 'github username', 'github link', 'git hub', 'github handle',
      'github id', 'github profile link'],
    negative: ['repo', 'repository', 'project'],
    types: ['url', 'text'],
  },
  {
    key: 'portfolio',
    aliases: ['portfolio', 'website', 'personal website', 'portfolio link', 'portfolio url', 'personal site', 'blog',
      'web site', 'homepage', 'personal url', 'portfolio website', 'personal blog'],
    negative: ['company', 'college', 'organization', 'organisation', 'startup', 'linkedin', 'github', 'twitter',
      'event', 'business'],
    types: ['url', 'text'],
    autocomplete: ['url'],
  },
  {
    key: 'twitter',
    aliases: ['twitter', 'x handle', 'twitter handle', 'twitter profile', 'twitter url', 'x profile', 'twitter id',
      'x twitter', 'twitter x', 'x com'],
    types: ['url', 'text'],
  },
  {
    key: 'interests',
    aliases: ['areas of interest', 'interests', 'interested in', 'domain of interest', 'topics of interest', 'tracks',
      'area of interest', 'interest', 'fields of interest', 'preferred track', 'track', 'topics', 'which topics',
      'domains', 'preferred domain', 'preferred topics', 'sessions of interest', 'themes', 'domain interest'],
    negative: ['not', 'job', 'internship'],
    types: ['checkbox-group', ...CHOICE, 'text', 'textarea'],
  },
  {
    key: 'tshirtSize',
    aliases: ['t shirt size', 'tshirt size', 'shirt size', 't shirt', 'tshirt', 'size', 'tee size', 'jersey size',
      'hoodie size', 'merch size', 'swag size', 'tee shirt size'],
    negative: ['file', 'team', 'company', 'font', 'shoe'],
    types: [...CHOICE, 'text'],
  },
  {
    key: 'dietaryPreference',
    aliases: ['food preference', 'dietary', 'meal preference', 'dietary preference', 'diet', 'dietary restrictions',
      'dietary requirement', 'veg non veg', 'veg', 'food', 'lunch preference', 'meal', 'food choice', 'dietary needs',
      'meal choice'],
    negative: ['allergy', 'allergies'],
    types: [...CHOICE, 'text'],
  },
  {
    key: 'teamName',
    aliases: ['team name', 'name of team', 'team', 'squad name', 'group name', 'team title', 'name of your team'],
    negative: ['member', 'size', 'leader', 'captain', 'count', 'college', 'email', 'phone', 'mobile', 'lead'],
    types: ['text'],
  },
  {
    key: 'howDidYouHear',
    aliases: ['how did you hear', 'how did you come to know', 'source', 'referred by', 'how did you hear about us',
      'how did you hear about this event', 'where did you hear', 'how did you find', 'how did you learn about',
      'heard from', 'referral source', 'where did you find', 'how did you get to know', 'who referred you',
      'came to know through', 'how did you know about'],
    negative: ['open', 'code', 'income', 'funding', 'data', 'traffic'],
    types: [...CHOICE, 'checkbox-group', 'text', 'textarea'],
  },
];

const prep = (text) => {
  const toks = tokens(text);
  return { text, norm: toks.join(' '), toks, set: new Set(toks) };
};

/** Builds the scoring-ready form of a dictionary entry. */
export const prepareEntry = (e) => ({
  ...e,
  preparedAliases: e.aliases.map(prep).filter((a) => a.norm),
  preparedNegative: (e.negative ?? []).map(prep).filter((n) => n.norm),
  autocomplete: e.autocomplete ?? [],
  inputTypes: e.inputTypes ?? [],
});

export const DICTIONARY = RAW_DICTIONARY.map(prepareEntry);
export const ENTRY_BY_KEY = Object.fromEntries(DICTIONARY.map((e) => [e.key, e]));

/** Dictionary entries for the user's custom fields (alias = its label). */
export const customEntries = (profile) =>
  (profile?.customFields ?? []).map((c) =>
    prepareEntry({ key: c.key, aliases: [c.label], types: [...TEXT, ...CHOICE, 'email', 'tel', 'url', 'number'] }),
  );
