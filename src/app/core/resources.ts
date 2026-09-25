import type { Doc, Meta } from './api';

/** Where a select's options come from: a fixed list, or the /admin/meta payload. */
export type OptionSource =
  | { static: (string | { value: string; label: string })[] }
  | { meta: 'cities' | 'specialties' | 'facilities' | 'facilityTypes' | 'labCategories' | 'medicineCategories' | 'specialtyCategories' | 'articleCategories' | 'conditions' | 'surgeryCategories' | 'contentPages' | 'settingGroups' };

export type FieldType =
  | 'text' // single line
  | 'textarea'
  | 'number'
  | 'boolean'
  | 'select' // one of options
  | 'multiselect' // several of options (checkbox chips)
  | 'lookup' // free text with suggestions (e.g. 1,000+ facilities)
  | 'tags' // string[] entered comma-separated
  | 'list' // string[] entered one per line
  | 'json' // nested arrays/objects edited as JSON
  | 'date'
  | 'url'
  | 'schedule'; // a doctor's weekly consulting pattern

export type Field = {
  /** Dotted paths reach into nested objects, e.g. "geo.lat", "author.slug". */
  key: string;
  label: string;
  type: FieldType;
  required?: boolean;
  options?: OptionSource;
  hint?: string;
  /** Shown but never sent (e.g. an order's items). */
  readonly?: boolean;
  /** Only when creating (slugs become public URLs and can't change later). */
  createOnly?: boolean;
  /** Spans the full form width. */
  wide?: boolean;
  placeholder?: string;
};

export type Section = { title: string; fields: Field[] };

export type Column = { key: string; label: string; format?: 'money' | 'date' | 'datetime' | 'bool' | 'badge' | 'stars'; labels?: Record<string, string> };

/** tabs: shown as one-click tabs above the table instead of a dropdown. */
export type Filter = { key: string; label: string; options: OptionSource; tabs?: boolean };

export type Resource = {
  /** API path segment and route, e.g. "lab-tests". */
  name: string;
  label: string;
  singular: string;
  icon: string;
  group: string;
  key: 'slug' | 'id';
  columns: Column[];
  filters: Filter[];
  sections: Section[];
  canCreate: boolean;
  canDelete: boolean;
  /** Public page for a record, e.g. doctor → /doctor/{slug}. */
  sitePath?: (doc: Doc) => string;
  /** Default values for a new record. */
  defaults?: Doc;
  description: string;
};

const YES_NO: OptionSource = { static: [{ value: 'true', label: 'Yes' }, { value: 'false', label: 'No' }] };
const CITY: OptionSource = { meta: 'cities' };

export const RESOURCES: Resource[] = [
  // ---------------------------------------------------------------- Doctors & care
  {
    name: 'doctors',
    label: 'Doctors',
    singular: 'doctor',
    icon: 'stethoscope',
    group: 'Doctors & care',
    key: 'slug',
    canCreate: true,
    canDelete: true,
    description: 'Every doctor on Curxx. Attach a doctor to a hospital or clinic and set their weekly schedule — bookable slots are generated from it automatically.',
    sitePath: (d) => `/doctor/${d['slug']}`,
    defaults: { gender: 'female', languages: ['English', 'Hindi'], verified: true, freeVideo: false, instant: false, experienceYears: 5, fee: 500, videoFee: 400 },
    columns: [
      { key: 'name', label: 'Name' },
      { key: 'specialty', label: 'Specialty', format: 'badge' },
      { key: 'city', label: 'City' },
      { key: 'clinicName', label: 'Clinic' },
      { key: 'fee', label: 'Fee', format: 'money' },
      { key: 'rating', label: 'Rating', format: 'stars' },
      { key: 'managed', label: 'Admin-edited', format: 'bool' },
    ],
    filters: [
      { key: 'city', label: 'City', options: CITY },
      { key: 'specialty', label: 'Specialty', options: { meta: 'specialties' } },
      { key: 'freeVideo', label: 'Free video', options: YES_NO },
      { key: 'managed', label: 'Admin-edited', options: YES_NO },
    ],
    sections: [
      {
        title: 'Profile',
        fields: [
          { key: 'name', label: 'Full name', type: 'text', required: true, placeholder: 'Dr. Asha Rao' },
          { key: 'slug', label: 'URL slug', type: 'text', createOnly: true, hint: 'Leave blank to generate from the name. Becomes /doctor/<slug>.' },
          { key: 'title', label: 'Title', type: 'text', required: true, placeholder: 'Consultant Dermatologist' },
          { key: 'qualification', label: 'Qualification', type: 'text', required: true, placeholder: 'MBBS, MD - Dermatology' },
          { key: 'specialty', label: 'Specialty', type: 'select', required: true, options: { meta: 'specialties' } },
          { key: 'focusAreas', label: 'Focus areas', type: 'tags', hint: 'Focus-area slugs of the specialty, e.g. acne-scars, hair-scalp' },
          { key: 'gender', label: 'Gender', type: 'select', options: { static: ['female', 'male'] } },
          { key: 'experienceYears', label: 'Experience (years)', type: 'number', required: true },
          { key: 'languages', label: 'Languages', type: 'tags', placeholder: 'English, Hindi, Kannada' },
          { key: 'registration', label: 'Medical council registration', type: 'text', placeholder: 'KMC 12345' },
          { key: 'photoUrl', label: 'Photo URL', type: 'url', wide: true },
          { key: 'about', label: 'About', type: 'textarea', wide: true },
          { key: 'education', label: 'Education', type: 'json', wide: true, hint: '[{"degree":"MBBS","institute":"AIIMS New Delhi","year":2010}]' },
        ],
      },
      {
        title: 'Where they practise',
        fields: [
          { key: 'facilitySlug', label: 'Hospital / clinic', type: 'lookup', options: { meta: 'facilities' }, hint: 'Picking one fills clinic, area and city automatically.' },
          { key: 'city', label: 'City', type: 'select', options: CITY },
          { key: 'area', label: 'Area / locality', type: 'text' },
          { key: 'clinicName', label: 'Clinic name', type: 'text' },
          { key: 'phone', label: 'Direct phone (Call button)', type: 'text', hint: 'Leave empty to use the clinic’s number.' },
          { key: 'whatsapp', label: 'WhatsApp number', type: 'text', hint: 'Digits with country code, e.g. 919876543210. Empty = clinic’s or Curxx’s WhatsApp.' },
          { key: 'rank', label: 'Ranking in its city & specialty', type: 'number', hint: '1 = shown first in listings, 2 = second… 0 or empty = normal order. Easier to set on the Rankings page.' },
        ],
      },
      {
        title: 'Fees & availability',
        fields: [
          { key: 'fee', label: 'Clinic visit fee (₹)', type: 'number', required: true },
          { key: 'videoFee', label: 'Video consult fee (₹)', type: 'number' },
          { key: 'freeVideo', label: 'Offers a free first video consult', type: 'boolean' },
          { key: 'instant', label: 'Online 24x7', type: 'boolean' },
          { key: 'verified', label: 'Credentials verified', type: 'boolean' },
          { key: 'schedule', label: 'Weekly schedule', type: 'schedule', wide: true },
          { key: 'consultHours', label: 'Consult hours (auto)', type: 'text', readonly: true, wide: true },
        ],
      },
      {
        title: 'Ratings (calculated from reviews)',
        fields: [
          { key: 'rating', label: 'Rating', type: 'number', readonly: true },
          { key: 'reviewCount', label: 'Reviews', type: 'number', readonly: true },
          { key: 'recommendPercent', label: 'Recommend %', type: 'number', readonly: true },
        ],
      },
    ],
  },
  {
    name: 'facilities',
    label: 'Hospitals & clinics',
    singular: 'hospital or clinic',
    icon: 'local_hospital',
    group: 'Doctors & care',
    key: 'slug',
    canCreate: true,
    canDelete: true,
    description: 'Hospitals, clinics and centres, with their facility type (one of 19), departments and hours.',
    sitePath: (d) => `/clinic/${d['slug']}`,
    defaults: { category: 'Clinic', type: 'clinic', openHours: '9:00 AM – 9:00 PM', opdHours: '10:00 AM – 8:00 PM', rating: 4.5, emergency24x7: false, nabh: false },
    columns: [
      { key: 'name', label: 'Name' },
      { key: 'category', label: 'Type', format: 'badge' },
      { key: 'city', label: 'City' },
      { key: 'area', label: 'Area' },
      { key: 'emergency24x7', label: '24x7', format: 'bool' },
      { key: 'rating', label: 'Rating', format: 'stars' },
    ],
    filters: [
      { key: 'city', label: 'City', options: CITY },
      { key: 'category', label: 'Type', options: { meta: 'facilityTypes' } },
      { key: 'emergency24x7', label: '24x7 emergency', options: YES_NO },
    ],
    sections: [
      {
        title: 'Basics',
        fields: [
          { key: 'name', label: 'Name', type: 'text', required: true },
          { key: 'slug', label: 'URL slug', type: 'text', createOnly: true, hint: 'Leave blank to generate from the name.' },
          { key: 'shortName', label: 'Short name', type: 'text' },
          { key: 'category', label: 'Facility type', type: 'select', required: true, options: { meta: 'facilityTypes' } },
          { key: 'type', label: 'Listed under', type: 'select', options: { static: [{ value: 'hospital', label: 'Hospitals' }, { value: 'clinic', label: 'Clinics' }] }, hint: 'Set automatically from the facility type.' },
          { key: 'tagline', label: 'Tagline', type: 'text' },
          { key: 'about', label: 'About', type: 'textarea', wide: true },
          { key: 'photoUrl', label: 'Photo URL', type: 'url', wide: true },
          { key: 'gallery', label: 'More photos (one URL per line)', type: 'list', wide: true, hint: 'Shown beside the main photo on the profile. Empty = the default clinic interior photo (Site settings).' },
        ],
      },
      {
        title: 'Location & contact',
        fields: [
          { key: 'city', label: 'City', type: 'select', required: true, options: CITY },
          { key: 'area', label: 'Area', type: 'text', required: true },
          { key: 'address', label: 'Address', type: 'text', required: true, wide: true },
          { key: 'pincode', label: 'Pincode', type: 'text' },
          { key: 'phone', label: 'Phone', type: 'text' },
          { key: 'whatsapp', label: 'WhatsApp number', type: 'text', hint: 'Digits with country code. Empty = Curxx’s WhatsApp.' },
          { key: 'rank', label: 'Ranking in its city', type: 'number', hint: '1 = shown first in listings, 2 = second… 0 or empty = normal order. Easier to set on the Rankings page.' },
          { key: 'geo.lat', label: 'Latitude', type: 'number' },
          { key: 'geo.lng', label: 'Longitude', type: 'number' },
        ],
      },
      {
        title: 'Hours & services',
        fields: [
          { key: 'openHours', label: 'Opening hours', type: 'text', placeholder: '8:00 AM – 10:00 PM or Open 24 hours' },
          { key: 'opdHours', label: 'OPD (consultation) hours', type: 'text', hint: 'Doctors’ schedules should fall inside these.' },
          { key: 'emergency24x7', label: '24x7 emergency', type: 'boolean' },
          { key: 'nabh', label: 'NABH accredited', type: 'boolean' },
          { key: 'beds', label: 'Beds', type: 'number' },
          { key: 'established', label: 'Established (year)', type: 'number' },
          { key: 'specialties', label: 'Specialties', type: 'multiselect', options: { meta: 'specialties' }, wide: true },
          { key: 'departments', label: 'Departments', type: 'tags', wide: true },
          { key: 'services', label: 'Services', type: 'tags', wide: true },
          { key: 'amenities', label: 'Amenities', type: 'tags', wide: true },
          { key: 'insurers', label: 'Cashless insurers', type: 'tags', wide: true },
          { key: 'rating', label: 'Rating', type: 'number' },
          { key: 'reviewCount', label: 'Review count', type: 'number' },
        ],
      },
    ],
  },
  {
    name: 'specialties',
    label: 'Specialties',
    singular: 'specialty',
    icon: 'medical_services',
    group: 'Doctors & care',
    key: 'slug',
    canCreate: true,
    canDelete: true,
    description: 'Clinical specialties. Each one gets listing pages in every city (/city/<slug>).',
    sitePath: (d) => `/bangalore/${d['slug']}`,
    defaults: { icon: 'stethoscope', video: true, popular: false, fromPrice: 499, videoFrom: 299 },
    columns: [
      { key: 'name', label: 'Name' },
      { key: 'category', label: 'Category', format: 'badge' },
      { key: 'fromPrice', label: 'From', format: 'money' },
      { key: 'popular', label: 'Popular', format: 'bool' },
      { key: 'video', label: 'Video', format: 'bool' },
      { key: 'homeOrder', label: 'Homepage' },
    ],
    filters: [{ key: 'category', label: 'Category', options: { meta: 'specialtyCategories' } }],
    sections: [
      {
        title: 'Specialty',
        fields: [
          { key: 'name', label: 'Name', type: 'text', required: true, placeholder: 'Dermatologist' },
          { key: 'plural', label: 'Plural', type: 'text', required: true, placeholder: 'Dermatologists' },
          { key: 'slug', label: 'URL slug', type: 'text', createOnly: true },
          { key: 'category', label: 'Category', type: 'select', options: { meta: 'specialtyCategories' } },
          { key: 'icon', label: 'Icon (Material Symbols name)', type: 'text' },
          { key: 'fromPrice', label: 'Clinic fee from (₹)', type: 'number', required: true },
          { key: 'videoFrom', label: 'Video fee from (₹)', type: 'number' },
          { key: 'video', label: 'Offers video consults', type: 'boolean' },
          { key: 'popular', label: 'Popular', type: 'boolean' },
          { key: 'homeOrder', label: 'Homepage tile position', type: 'number', hint: '1–12 shows it among the 12 homepage specialty tiles, in that order. 0 = not on the homepage.' },
          { key: 'order', label: 'Order in its category', type: 'number' },
          { key: 'description', label: 'Description', type: 'textarea', wide: true },
          { key: 'conditions', label: 'Conditions treated', type: 'list', wide: true },
          { key: 'whenToSee', label: 'When to see one', type: 'list', wide: true },
          { key: 'keywords', label: 'Search / triage keywords', type: 'text', wide: true, hint: 'Pipe-separated, e.g. acne|pimple|rash' },
          { key: 'related', label: 'Related specialty slugs', type: 'tags', wide: true },
          { key: 'subSpecialties', label: 'Focus areas', type: 'json', wide: true, hint: '[{"slug":"acne-scars","name":"Acne & Scars","description":"…","icon":"face"}]' },
        ],
      },
    ],
  },
  {
    name: 'reviews',
    label: 'Reviews',
    singular: 'review',
    icon: 'reviews',
    group: 'Doctors & care',
    key: 'id',
    canCreate: true,
    canDelete: true,
    description: 'Patient reviews. A doctor’s rating and review count are recalculated after every change.',
    defaults: { rating: 5, mode: 'clinic', verified: true },
    columns: [
      { key: 'doctorSlug', label: 'Doctor' },
      { key: 'author', label: 'Author' },
      { key: 'rating', label: 'Rating', format: 'stars' },
      { key: 'mode', label: 'Mode', format: 'badge' },
      { key: 'createdAt', label: 'Date', format: 'date' },
    ],
    filters: [
      { key: 'rating', label: 'Rating', options: { static: ['5', '4', '3', '2', '1'] } },
      { key: 'mode', label: 'Mode', options: { static: ['clinic', 'video'] } },
    ],
    sections: [
      {
        title: 'Review',
        fields: [
          { key: 'doctorSlug', label: 'Doctor slug', type: 'text', required: true, placeholder: 'dr-priya-sharma' },
          { key: 'author', label: 'Author', type: 'text', required: true, placeholder: 'Ramesh K.' },
          { key: 'rating', label: 'Rating', type: 'select', required: true, options: { static: ['5', '4', '3', '2', '1'] } },
          { key: 'mode', label: 'Mode', type: 'select', required: true, options: { static: ['clinic', 'video'] } },
          { key: 'visitedFor', label: 'Visited for', type: 'text' },
          { key: 'verified', label: 'Verified visit', type: 'boolean' },
          { key: 'text', label: 'Review', type: 'textarea', required: true, wide: true },
          { key: 'tags', label: 'Tags', type: 'tags', wide: true },
        ],
      },
    ],
  },

  // ---------------------------------------------------------------- Diagnostics
  {
    name: 'labs',
    label: 'Labs',
    singular: 'lab',
    icon: 'biotech',
    group: 'Diagnostics',
    key: 'slug',
    canCreate: true,
    canDelete: true,
    description: 'Partner labs and imaging centres: accreditation, home collection radius and the tests each one runs.',
    sitePath: (d) => `/lab/${d['slug']}`,
    defaults: { type: 'centre', homeCollection: true, walkIn: true, collectionRadiusKm: 8, phlebotomists: 4, reportTat: '6–24 hours', accreditations: ['NABL'], rating: 4.6 },
    columns: [
      { key: 'name', label: 'Name' },
      { key: 'type', label: 'Type', format: 'badge' },
      { key: 'city', label: 'City' },
      { key: 'area', label: 'Area' },
      { key: 'homeCollection', label: 'Home collection', format: 'bool' },
    ],
    filters: [
      { key: 'city', label: 'City', options: CITY },
      { key: 'type', label: 'Type', options: { static: ['reference', 'centre', 'imaging'] } },
    ],
    sections: [
      {
        title: 'Lab',
        fields: [
          { key: 'name', label: 'Name', type: 'text', required: true },
          { key: 'slug', label: 'URL slug', type: 'text', createOnly: true },
          { key: 'shortName', label: 'Short name', type: 'text' },
          { key: 'type', label: 'Type', type: 'select', required: true, options: { static: ['reference', 'centre', 'imaging'] } },
          { key: 'tagline', label: 'Tagline', type: 'text', wide: true },
          { key: 'about', label: 'About', type: 'textarea', wide: true },
          { key: 'accreditations', label: 'Accreditations', type: 'multiselect', options: { static: ['NABL', 'CAP', 'ISO 15189'] } },
          { key: 'nablCertificate', label: 'NABL certificate no.', type: 'text' },
          { key: 'photoUrl', label: 'Photo URL', type: 'url', wide: true },
        ],
      },
      {
        title: 'Location & hours',
        fields: [
          { key: 'city', label: 'City', type: 'select', required: true, options: CITY },
          { key: 'area', label: 'Area', type: 'text', required: true },
          { key: 'address', label: 'Address', type: 'text', required: true, wide: true },
          { key: 'pincode', label: 'Pincode', type: 'text', required: true },
          { key: 'phone', label: 'Phone', type: 'text' },
          { key: 'whatsapp', label: 'WhatsApp number', type: 'text', hint: 'Digits with country code. Empty = Curxx’s WhatsApp.' },
          { key: 'rank', label: 'Ranking in its city', type: 'number', hint: '1 = shown first in listings, 2 = second… 0 or empty = normal order. Easier to set on the Rankings page.' },
          { key: 'geo.lat', label: 'Latitude', type: 'number', required: true },
          { key: 'geo.lng', label: 'Longitude', type: 'number', required: true },
          { key: 'openHours', label: 'Opening hours', type: 'text' },
          { key: 'sundayHours', label: 'Sunday hours', type: 'text', hint: '"Closed" if shut on Sundays' },
        ],
      },
      {
        title: 'Collection & reporting',
        fields: [
          { key: 'homeCollection', label: 'Home sample collection', type: 'boolean' },
          { key: 'walkIn', label: 'Walk-ins', type: 'boolean' },
          { key: 'collectionRadiusKm', label: 'Collection radius (km)', type: 'number' },
          { key: 'phlebotomists', label: 'Phlebotomists per window', type: 'number' },
          { key: 'reportTat', label: 'Report turnaround', type: 'text' },
          { key: 'pathologist.name', label: 'Pathologist', type: 'text' },
          { key: 'pathologist.qualification', label: 'Pathologist qualification', type: 'text' },
          { key: 'pathologist.registration', label: 'Pathologist registration', type: 'text' },
          { key: 'tests', label: 'Tests offered (slugs)', type: 'tags', wide: true },
          { key: 'equipment', label: 'Equipment', type: 'tags', wide: true },
          { key: 'amenities', label: 'Amenities', type: 'tags', wide: true },
        ],
      },
    ],
  },
  {
    name: 'lab-tests',
    label: 'Lab tests & scans',
    singular: 'test',
    icon: 'science',
    group: 'Diagnostics',
    key: 'slug',
    canCreate: true,
    canDelete: true,
    description: 'The diagnostic directory: packages, single tests, scans and procedures. Scans and procedures are visit-only.',
    sitePath: (d) => `/lab-tests/${d['slug']}`,
    defaults: { kind: 'test', homeCollection: true, testsIncluded: 1, sampleType: 'Blood', reportTime: '6h Digital Report', turnaround: 'Reports within 6h', popularity: 50 },
    columns: [
      { key: 'name', label: 'Name' },
      { key: 'kind', label: 'Kind', format: 'badge' },
      { key: 'department', label: 'Department' },
      { key: 'price', label: 'Price', format: 'money' },
      { key: 'mrp', label: 'MRP', format: 'money' },
      { key: 'homeCollection', label: 'At home', format: 'bool' },
    ],
    filters: [
      { key: 'kind', label: 'Kind', options: { static: ['package', 'test', 'scan', 'procedure'] } },
      { key: 'categories', label: 'Category', options: { meta: 'labCategories' } },
      { key: 'homeCollection', label: 'Home collection', options: YES_NO },
    ],
    sections: [
      {
        title: 'Test',
        fields: [
          { key: 'name', label: 'Name', type: 'text', required: true },
          { key: 'slug', label: 'URL slug', type: 'text', createOnly: true },
          { key: 'kind', label: 'Kind', type: 'select', required: true, options: { static: ['package', 'test', 'scan', 'procedure'] } },
          { key: 'department', label: 'Department', type: 'text' },
          { key: 'homeCollection', label: 'Sample can be collected at home', type: 'boolean' },
          { key: 'categories', label: 'Categories', type: 'multiselect', options: { meta: 'labCategories' }, wide: true },
          { key: 'price', label: 'Price (₹)', type: 'number', required: true },
          { key: 'mrp', label: 'MRP (₹)', type: 'number', required: true },
          { key: 'testsIncluded', label: 'Parameters / tests included', type: 'number', required: true },
          { key: 'sampleType', label: 'Sample type', type: 'text' },
          { key: 'fastingHours', label: 'Fasting hours', type: 'text', placeholder: '8 to 10' },
          { key: 'fastingLabel', label: 'Fasting label', type: 'text', placeholder: 'No fasting required' },
          { key: 'reportTime', label: 'Report time', type: 'text' },
          { key: 'turnaround', label: 'Turnaround', type: 'text' },
          { key: 'popularity', label: 'Popularity (sort)', type: 'number' },
          { key: 'covers', label: 'Covers', type: 'textarea', wide: true },
          { key: 'highlights', label: 'Highlights', type: 'list', wide: true },
          { key: 'parameterGroups', label: 'Parameter groups', type: 'json', wide: true, hint: '[{"name":"Liver","icon":"labs","count":2,"parameters":["SGOT","SGPT"]}]' },
        ],
      },
    ],
  },
  {
    name: 'lab-categories',
    label: 'Lab categories',
    singular: 'lab category',
    icon: 'category',
    group: 'Diagnostics',
    key: 'slug',
    canCreate: true,
    canDelete: true,
    description: 'Health concerns (Diabetes, Thyroid…) and departments (Radiology, Microbiology…) that group tests.',
    defaults: { icon: 'labs', group: 'concern', order: 50 },
    columns: [
      { key: 'name', label: 'Name' },
      { key: 'group', label: 'Group', format: 'badge' },
      { key: 'order', label: 'Order' },
    ],
    filters: [{ key: 'group', label: 'Group', options: { static: ['concern', 'department'] } }],
    sections: [
      {
        title: 'Category',
        fields: [
          { key: 'name', label: 'Name', type: 'text', required: true },
          { key: 'slug', label: 'Slug', type: 'text', createOnly: true },
          { key: 'group', label: 'Group', type: 'select', options: { static: ['concern', 'department'] } },
          { key: 'icon', label: 'Icon', type: 'text' },
          { key: 'order', label: 'Order', type: 'number' },
        ],
      },
    ],
  },

  // ---------------------------------------------------------------- Pharmacy
  {
    name: 'medicines',
    label: 'Medicines',
    singular: 'medicine',
    icon: 'medication',
    group: 'Pharmacy',
    key: 'slug',
    canCreate: true,
    canDelete: true,
    description: 'Medicines and wellness products, with price, stock and whether a prescription is needed.',
    sitePath: (d) => `/medicines/${d['slug']}`,
    defaults: { form: 'Tablet', rxRequired: false, stock: 100, icon: 'pill', rating: 4.5, popularity: 50 },
    columns: [
      { key: 'name', label: 'Name' },
      { key: 'manufacturer', label: 'Manufacturer' },
      { key: 'price', label: 'Price', format: 'money' },
      { key: 'stock', label: 'Stock' },
      { key: 'rxRequired', label: 'Rx', format: 'bool' },
    ],
    filters: [
      { key: 'categories', label: 'Category', options: { meta: 'medicineCategories' } },
      { key: 'rxRequired', label: 'Needs prescription', options: YES_NO },
    ],
    sections: [
      {
        title: 'Product',
        fields: [
          { key: 'name', label: 'Name', type: 'text', required: true },
          { key: 'slug', label: 'URL slug', type: 'text', createOnly: true },
          { key: 'subtitle', label: 'Subtitle', type: 'text', required: true, placeholder: 'Paracetamol 650mg · Strip of 15' },
          { key: 'manufacturer', label: 'Manufacturer', type: 'text', required: true },
          { key: 'composition', label: 'Composition', type: 'text', required: true, wide: true },
          { key: 'form', label: 'Form', type: 'text', required: true },
          { key: 'packSize', label: 'Pack size', type: 'text', required: true },
          { key: 'categories', label: 'Categories', type: 'multiselect', options: { meta: 'medicineCategories' }, wide: true },
          { key: 'imageUrl', label: 'Image URL', type: 'url', wide: true },
        ],
      },
      {
        title: 'Price & stock',
        fields: [
          { key: 'price', label: 'Price (₹)', type: 'number', required: true },
          { key: 'mrp', label: 'MRP (₹)', type: 'number', required: true },
          { key: 'stock', label: 'Stock', type: 'number' },
          { key: 'rxRequired', label: 'Prescription required', type: 'boolean' },
          { key: 'popularity', label: 'Popularity (sort)', type: 'number' },
        ],
      },
      {
        title: 'Information',
        fields: [
          { key: 'description', label: 'Description', type: 'textarea', wide: true },
          { key: 'uses', label: 'Uses', type: 'list', wide: true },
          { key: 'sideEffects', label: 'Side effects', type: 'list', wide: true },
          { key: 'howToUse', label: 'How to use', type: 'textarea', wide: true },
          { key: 'safetyAdvice', label: 'Safety advice', type: 'list', wide: true },
          { key: 'storage', label: 'Storage', type: 'text', wide: true },
        ],
      },
    ],
  },
  {
    name: 'medicine-categories',
    label: 'Medicine categories',
    singular: 'medicine category',
    icon: 'category',
    group: 'Pharmacy',
    key: 'slug',
    canCreate: true,
    canDelete: true,
    description: 'Categories shown in the medicine store.',
    defaults: { icon: 'medication', featured: false, order: 50 },
    columns: [
      { key: 'name', label: 'Name' },
      { key: 'featured', label: 'Featured', format: 'bool' },
      { key: 'order', label: 'Order' },
    ],
    filters: [],
    sections: [
      {
        title: 'Category',
        fields: [
          { key: 'name', label: 'Name', type: 'text', required: true },
          { key: 'slug', label: 'Slug', type: 'text', createOnly: true },
          { key: 'icon', label: 'Icon', type: 'text' },
          { key: 'featured', label: 'Featured', type: 'boolean' },
          { key: 'order', label: 'Order', type: 'number' },
        ],
      },
    ],
  },

  // ---------------------------------------------------------------- Content
  {
    name: 'articles',
    label: 'Blog articles',
    singular: 'article',
    icon: 'article',
    group: 'Content',
    key: 'slug',
    canCreate: true,
    canDelete: true,
    description: 'Health articles on /blog. Link one to a condition to show it on that condition’s page.',
    sitePath: (d) => `/blog/${d['slug']}`,
    defaults: { readMinutes: 5, featured: false, sections: [{ heading: 'Overview', body: '' }] },
    columns: [
      { key: 'title', label: 'Title' },
      { key: 'category', label: 'Category', format: 'badge' },
      { key: 'author.name', label: 'Author' },
      { key: 'publishedAt', label: 'Published', format: 'date' },
      { key: 'featured', label: 'Featured', format: 'bool' },
    ],
    filters: [{ key: 'category', label: 'Category', options: { meta: 'articleCategories' } }],
    sections: [
      {
        title: 'Article',
        fields: [
          { key: 'title', label: 'Title', type: 'text', required: true, wide: true },
          { key: 'slug', label: 'URL slug', type: 'text', createOnly: true },
          { key: 'category', label: 'Category', type: 'lookup', required: true, options: { meta: 'articleCategories' } },
          { key: 'excerpt', label: 'Excerpt', type: 'textarea', required: true, wide: true },
          { key: 'coverUrl', label: 'Cover image URL', type: 'url', wide: true },
          { key: 'readMinutes', label: 'Read time (min)', type: 'number' },
          { key: 'publishedAt', label: 'Published on', type: 'date' },
          { key: 'featured', label: 'Featured', type: 'boolean' },
          { key: 'condition', label: 'Condition page', type: 'select', options: { meta: 'conditions' } },
          { key: 'author.slug', label: 'Author (doctor slug)', type: 'text', hint: 'Name and title are filled in from the doctor’s profile.' },
          { key: 'tags', label: 'Tags', type: 'tags', wide: true },
          { key: 'keyTakeaways', label: 'Key takeaways', type: 'list', wide: true },
          { key: 'sections', label: 'Sections', type: 'json', wide: true, hint: '[{"heading":"What is it?","body":"…"}]' },
        ],
      },
    ],
  },

  // ---------------------------------------------------------------- Operations
  {
    name: 'appointments',
    label: 'Appointments',
    singular: 'appointment',
    icon: 'event_available',
    group: 'Operations',
    key: 'id',
    canCreate: false,
    canDelete: false,
    description: 'Bookings made by patients. You can change the status (cancelling frees the slot) and add notes.',
    columns: [
      { key: 'reference', label: 'Reference' },
      { key: 'patient.name', label: 'Patient' },
      { key: 'doctorSlug', label: 'Doctor' },
      { key: 'startsAt', label: 'When', format: 'datetime' },
      { key: 'mode', label: 'Mode', format: 'badge', labels: { clinic: 'Clinic visit', video: 'Video', audio: 'Teleconsultation (phone)' } },
      { key: 'amount', label: 'Amount', format: 'money' },
      { key: 'status', label: 'Status', format: 'badge' },
    ],
    filters: [
      { key: 'status', label: 'Status', options: { static: ['confirmed', 'completed', 'cancelled'] } },
      { key: 'mode', label: 'Mode', tabs: true, options: { static: [{ value: 'clinic', label: 'Clinic visit' }, { value: 'video', label: 'Video' }, { value: 'audio', label: 'Teleconsultation (phone)' }] } },
    ],
    sections: [
      {
        title: 'Booking',
        fields: [
          { key: 'reference', label: 'Reference', type: 'text', readonly: true },
          { key: 'doctorSlug', label: 'Doctor', type: 'text', readonly: true },
          { key: 'startsAt', label: 'When', type: 'text', readonly: true },
          { key: 'mode', label: 'Mode (clinic / video / audio = phone teleconsultation)', type: 'text', readonly: true },
          { key: 'amount', label: 'Amount (₹)', type: 'number', readonly: true },
          { key: 'patient.name', label: 'Patient', type: 'text', readonly: true },
          { key: 'patient.phone', label: 'Phone', type: 'text', readonly: true },
          { key: 'focus', label: 'Concern', type: 'text', readonly: true },
          { key: 'status', label: 'Status', type: 'select', options: { static: ['confirmed', 'completed', 'cancelled'] } },
          { key: 'notes', label: 'Notes', type: 'textarea', wide: true },
        ],
      },
    ],
  },
  {
    name: 'orders',
    label: 'Orders',
    singular: 'order',
    icon: 'receipt_long',
    group: 'Operations',
    key: 'id',
    canCreate: false,
    canDelete: false,
    description: 'Medicine and lab-test orders. Move an order through its statuses as it is packed, delivered or reported.',
    columns: [
      { key: 'reference', label: 'Reference' },
      { key: 'kind', label: 'Kind', format: 'badge' },
      { key: 'total', label: 'Total', format: 'money' },
      { key: 'status', label: 'Status', format: 'badge' },
      { key: 'createdAt', label: 'Placed', format: 'datetime' },
    ],
    filters: [
      { key: 'kind', label: 'Kind', options: { static: ['pharmacy', 'lab'] } },
      { key: 'status', label: 'Status', options: { static: ['placed', 'confirmed', 'packed', 'out_for_delivery', 'delivered', 'sample_scheduled', 'sample_collected', 'report_ready', 'cancelled'] } },
    ],
    sections: [
      {
        title: 'Order',
        fields: [
          { key: 'reference', label: 'Reference', type: 'text', readonly: true },
          { key: 'kind', label: 'Kind', type: 'text', readonly: true },
          { key: 'total', label: 'Total (₹)', type: 'number', readonly: true },
          { key: 'patient.name', label: 'Patient', type: 'text', readonly: true },
          { key: 'lab.name', label: 'Lab', type: 'text', readonly: true },
          { key: 'pickup.window', label: 'Collection window', type: 'text', readonly: true },
          { key: 'status', label: 'Status', type: 'select', options: { static: ['placed', 'confirmed', 'packed', 'out_for_delivery', 'delivered', 'sample_scheduled', 'sample_collected', 'report_ready', 'cancelled'] } },
          { key: 'payment.status', label: 'Payment status', type: 'select', options: { static: ['pending', 'paid', 'refunded'] } },
          { key: 'items', label: 'Items', type: 'json', readonly: true, wide: true },
          { key: 'address', label: 'Address', type: 'json', readonly: true, wide: true },
        ],
      },
    ],
  },
  {
    name: 'leads',
    label: 'Leads',
    singular: 'lead',
    icon: 'contact_phone',
    group: 'Operations',
    key: 'id',
    canCreate: false,
    canDelete: true,
    description: 'Surgery consultations, Curxx Plus sign-ups, partner and corporate enquiries, and callback requests.',
    columns: [
      { key: 'kind', label: 'Kind', format: 'badge' },
      { key: 'name', label: 'Name' },
      { key: 'phone', label: 'Phone' },
      { key: 'surgery', label: 'Surgery' },
      { key: 'city', label: 'City' },
      { key: 'status', label: 'Status', format: 'badge' },
      { key: 'createdAt', label: 'Received', format: 'datetime' },
    ],
    filters: [
      { key: 'kind', label: 'Kind', options: { static: ['surgery', 'plus', 'provider', 'hospital', 'corporate', 'callback', 'newsletter'] } },
      { key: 'status', label: 'Status', options: { static: ['new', 'contacted', 'converted', 'closed'] } },
    ],
    sections: [
      {
        title: 'Lead',
        fields: [
          { key: 'kind', label: 'Kind', type: 'text', readonly: true },
          { key: 'name', label: 'Name', type: 'text', readonly: true },
          { key: 'phone', label: 'Phone', type: 'text', readonly: true },
          { key: 'email', label: 'Email', type: 'text', readonly: true },
          { key: 'city', label: 'City', type: 'text', readonly: true },
          { key: 'surgery', label: 'Surgery', type: 'text', readonly: true },
          { key: 'organisation', label: 'Organisation', type: 'text', readonly: true },
          { key: 'source', label: 'Source', type: 'text', readonly: true },
          { key: 'message', label: 'Message', type: 'textarea', readonly: true, wide: true },
          { key: 'status', label: 'Status', type: 'select', options: { static: ['new', 'contacted', 'converted', 'closed'] } },
          { key: 'note', label: 'Team note', type: 'textarea', wide: true },
        ],
      },
    ],
  },
  {
    name: 'users',
    label: 'Patients',
    singular: 'patient',
    icon: 'group',
    group: 'Operations',
    key: 'id',
    canCreate: false,
    canDelete: false,
    description: 'Registered patient accounts. Mobile numbers can’t be changed here — they are the login.',
    columns: [
      { key: 'name', label: 'Name' },
      { key: 'phone', label: 'Mobile' },
      { key: 'email', label: 'Email' },
      { key: 'loginCount', label: 'Sign-ins' },
      { key: 'lastLoginAt', label: 'Last sign-in', format: 'datetime' },
      { key: 'createdAt', label: 'Joined', format: 'date' },
    ],
    filters: [{ key: 'gender', label: 'Gender', options: { static: ['female', 'male', 'other'] } }],
    sections: [
      {
        title: 'Account',
        fields: [
          { key: 'phone', label: 'Mobile', type: 'text', readonly: true },
          { key: 'abhaId', label: 'ABHA ID', type: 'text', readonly: true },
          { key: 'loginCount', label: 'Sign-ins', type: 'number', readonly: true },
          { key: 'lastLoginAt', label: 'Last sign-in', type: 'text', readonly: true },
          { key: 'createdAt', label: 'Joined', type: 'text', readonly: true },
          { key: 'name', label: 'Name', type: 'text' },
          { key: 'email', label: 'Email', type: 'text' },
          { key: 'gender', label: 'Gender', type: 'select', options: { static: ['female', 'male', 'other'] } },
          { key: 'bloodGroup', label: 'Blood group', type: 'select', options: { static: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'] } },
        ],
      },
    ],
  },
  // ---------------------------------------------------------------- Tracking
  {
    name: 'interactions',
    label: 'Calls & WhatsApp',
    singular: 'tap',
    icon: 'call',
    group: 'Tracking',
    key: 'id',
    canCreate: false,
    canDelete: true,
    description: 'Every tap on a Call or WhatsApp button on a doctor, hospital/clinic or lab profile — who (if signed in), which profile, and when. Use it to follow up and to see demand.',
    columns: [
      { key: 'kind', label: 'Button', format: 'badge', labels: { call: 'Call', whatsapp: 'WhatsApp' } },
      { key: 'targetName', label: 'Profile' },
      { key: 'targetType', label: 'Type', format: 'badge', labels: { doctor: 'Doctor', facility: 'Hospital / clinic', lab: 'Lab', site: 'Curxx' } },
      { key: 'city', label: 'City' },
      { key: 'userPhone', label: 'Patient (if signed in)' },
      { key: 'device', label: 'Device' },
      { key: 'createdAt', label: 'When', format: 'datetime' },
    ],
    filters: [
      { key: 'kind', label: 'Button', tabs: true, options: { static: [{ value: 'call', label: 'Calls' }, { value: 'whatsapp', label: 'WhatsApp' }] } },
      { key: 'targetType', label: 'Profile type', options: { static: [{ value: 'doctor', label: 'Doctor' }, { value: 'facility', label: 'Hospital / clinic' }, { value: 'lab', label: 'Lab' }] } },
      { key: 'city', label: 'City', options: { meta: 'cities' } },
      { key: 'device', label: 'Device', options: { static: ['mobile', 'desktop'] } },
    ],
    sections: [
      {
        title: 'Tap',
        fields: [
          { key: 'kind', label: 'Button', type: 'text', readonly: true },
          { key: 'targetName', label: 'Profile', type: 'text', readonly: true },
          { key: 'targetType', label: 'Profile type', type: 'text', readonly: true },
          { key: 'targetSlug', label: 'Profile slug', type: 'text', readonly: true },
          { key: 'number', label: 'Number opened', type: 'text', readonly: true },
          { key: 'userPhone', label: 'Patient mobile (if signed in)', type: 'text', readonly: true },
          { key: 'city', label: 'City', type: 'text', readonly: true },
          { key: 'page', label: 'Page', type: 'text', readonly: true, wide: true },
          { key: 'createdAt', label: 'When', type: 'text', readonly: true },
        ],
      },
    ],
  },
  {
    name: 'login-events',
    label: 'Sign-ins',
    singular: 'sign-in',
    icon: 'login',
    group: 'Tracking',
    key: 'id',
    canCreate: false,
    canDelete: false,
    description: 'Every patient sign-in, newest first. “First sign-in” marks a new account. Open a patient under Patients to see their full history.',
    columns: [
      { key: 'name', label: 'Name' },
      { key: 'phone', label: 'Mobile' },
      { key: 'firstLogin', label: 'New account', format: 'bool' },
      { key: 'device', label: 'Device' },
      { key: 'createdAt', label: 'When', format: 'datetime' },
    ],
    filters: [
      { key: 'firstLogin', label: 'New accounts', tabs: true, options: { static: [{ value: 'true', label: 'New accounts' }, { value: 'false', label: 'Returning' }] } },
      { key: 'device', label: 'Device', options: { static: ['mobile', 'desktop'] } },
    ],
    sections: [
      {
        title: 'Sign-in',
        fields: [
          { key: 'name', label: 'Name', type: 'text', readonly: true },
          { key: 'phone', label: 'Mobile', type: 'text', readonly: true },
          { key: 'firstLogin', label: 'First sign-in (new account)', type: 'boolean', readonly: true },
          { key: 'device', label: 'Device', type: 'text', readonly: true },
          { key: 'userAgent', label: 'Browser', type: 'text', readonly: true, wide: true },
          { key: 'createdAt', label: 'When', type: 'text', readonly: true },
        ],
      },
    ],
  },
  {
    name: 'reports',
    label: 'Wrong-info reports',
    singular: 'report',
    icon: 'report',
    group: 'Tracking',
    key: 'id',
    canCreate: false,
    canDelete: true,
    description: 'Patients’ “Report wrong information” submissions from profiles. Fix the record, then mark the report Fixed.',
    columns: [
      { key: 'targetName', label: 'Profile' },
      { key: 'targetType', label: 'Type', format: 'badge', labels: { doctor: 'Doctor', facility: 'Hospital / clinic', lab: 'Lab', 'lab-test': 'Lab test', medicine: 'Medicine' } },
      { key: 'issues', label: 'What’s wrong' },
      { key: 'city', label: 'City' },
      { key: 'status', label: 'Status', format: 'badge' },
      { key: 'createdAt', label: 'Received', format: 'datetime' },
    ],
    filters: [
      { key: 'status', label: 'Status', tabs: true, options: { static: ['new', 'reviewing', 'fixed', 'rejected'] } },
      { key: 'targetType', label: 'Type', options: { static: [{ value: 'doctor', label: 'Doctor' }, { value: 'facility', label: 'Hospital / clinic' }, { value: 'lab', label: 'Lab' }] } },
      { key: 'city', label: 'City', options: { meta: 'cities' } },
    ],
    sections: [
      {
        title: 'Report',
        fields: [
          { key: 'targetName', label: 'Profile', type: 'text', readonly: true },
          { key: 'targetType', label: 'Type', type: 'text', readonly: true },
          { key: 'targetSlug', label: 'Profile slug', type: 'text', readonly: true, hint: 'Open the matching section (Doctors, Hospitals & clinics, Labs) and search this slug to fix it.' },
          { key: 'issues', label: 'What’s wrong', type: 'tags', readonly: true, wide: true },
          { key: 'details', label: 'Details', type: 'textarea', readonly: true, wide: true },
          { key: 'contact', label: 'Reporter contact', type: 'text', readonly: true },
          { key: 'page', label: 'Page', type: 'text', readonly: true },
          { key: 'status', label: 'Status', type: 'select', options: { static: ['new', 'reviewing', 'fixed', 'rejected'] } },
          { key: 'note', label: 'Team note', type: 'textarea', wide: true },
        ],
      },
    ],
  },
  {
    name: 'videos',
    label: 'Reels & videos',
    singular: 'video',
    icon: 'smart_display',
    group: 'Content',
    key: 'slug',
    canCreate: true,
    canDelete: true,
    description: 'YouTube videos, Shorts, Instagram reels or .mp4 files. Link one to a doctor to show it on their profile; mark it Featured to show it on the homepage.',
    defaults: { kind: 'reel', published: true, featured: false, order: 10 },
    columns: [
      { key: 'title', label: 'Title' },
      { key: 'kind', label: 'Kind', format: 'badge' },
      { key: 'doctorSlug', label: 'Doctor' },
      { key: 'featured', label: 'Homepage', format: 'bool' },
      { key: 'published', label: 'Published', format: 'bool' },
    ],
    filters: [
      { key: 'kind', label: 'Kind', tabs: true, options: { static: [{ value: 'reel', label: 'Reels' }, { value: 'video', label: 'Videos' }] } },
      { key: 'published', label: 'Published', options: { static: [{ value: 'true', label: 'Yes' }, { value: 'false', label: 'No' }] } },
    ],
    sections: [
      {
        title: 'Video',
        fields: [
          { key: 'title', label: 'Title', type: 'text', required: true, wide: true },
          { key: 'slug', label: 'Slug', type: 'text', createOnly: true },
          { key: 'kind', label: 'Kind', type: 'select', options: { static: [{ value: 'reel', label: 'Reel (vertical)' }, { value: 'video', label: 'Video (landscape)' }] } },
          { key: 'url', label: 'Link', type: 'url', required: true, wide: true, placeholder: 'https://www.youtube.com/shorts/… or https://www.instagram.com/reel/…', hint: 'YouTube, YouTube Shorts, Instagram reel, or a direct .mp4 link.' },
          { key: 'thumbnailUrl', label: 'Thumbnail image URL (optional)', type: 'url', wide: true },
          { key: 'description', label: 'Description', type: 'textarea', wide: true },
          { key: 'doctorSlug', label: 'Doctor slug (shows on their profile)', type: 'text', placeholder: 'dr-priya-sharma' },
          { key: 'specialty', label: 'Specialty', type: 'select', options: { meta: 'specialties' } },
          { key: 'city', label: 'City', type: 'select', options: { meta: 'cities' } },
          { key: 'featured', label: 'Show on homepage', type: 'boolean' },
          { key: 'published', label: 'Published', type: 'boolean' },
          { key: 'order', label: 'Order', type: 'number' },
        ],
      },
    ],
  },
  // ---------------------------------------------------------------- Website content
  {
    name: 'site-settings',
    label: 'Site settings',
    singular: 'setting',
    icon: 'tune',
    group: 'Website',
    key: 'slug',
    canCreate: true,
    canDelete: true,
    description:
      'Single values used across the website: marketing claims, app links and images. Kind “Claim — must be true” marks statements that can’t be checked against our data (e.g. 1.2M+ consultations) — confirm each is true before it goes live. Counts that we can compute (doctors, clinics, ratings, tests) are live and have no setting. Deleting a built-in setting restores its original value on the next deploy.',
    defaults: { group: 'General', kind: 'text' },
    columns: [
      { key: 'label', label: 'Setting' },
      { key: 'value', label: 'Value' },
      { key: 'kind', label: 'Kind', format: 'badge' },
      { key: 'group', label: 'Group' },
    ],
    filters: [
      { key: 'group', label: 'Group', options: { meta: 'settingGroups' } },
      { key: 'kind', label: 'Kind', options: { static: [{ value: 'claim', label: 'Claim — must be true' }, 'text', 'number', 'url', 'image'] } },
    ],
    sections: [
      {
        title: 'Setting',
        fields: [
          { key: 'label', label: 'Name', type: 'text', required: true },
          { key: 'slug', label: 'Key', type: 'text', createOnly: true, hint: 'The website reads settings by this key, e.g. claim-patients. It can’t change later.' },
          { key: 'kind', label: 'Kind', type: 'select', options: { static: [{ value: 'claim', label: 'Claim — must be true' }, { value: 'text', label: 'Text' }, { value: 'number', label: 'Number' }, { value: 'url', label: 'Link' }, { value: 'image', label: 'Image URL' }] } },
          { key: 'group', label: 'Group', type: 'lookup', options: { meta: 'settingGroups' } },
          { key: 'value', label: 'Value', type: 'textarea', wide: true, hint: 'Claims must be true. Images: a full https:// URL, or a path on the website such as /images/home-hero.jpg.' },
          { key: 'note', label: 'Where it shows', type: 'textarea', wide: true },
        ],
      },
    ],
  },
  {
    name: 'content',
    label: 'Page content',
    singular: 'page section',
    icon: 'article',
    group: 'Website',
    key: 'slug',
    canCreate: true,
    canDelete: true,
    description:
      'Editable sections of website pages: FAQs, feature bands, service cards, partner programmes, trust badges, lab and pharmacy shortcuts, and legal pages. Headings levels are fixed by the page design (for SEO); edit the words here. In copy, {labTests}, {cities} and {accreditedFacilities} are filled in with live counts, and {city} in a link is the visitor’s city. Deleting a built-in section restores its original copy on the next deploy.',
    sitePath: (d) => (['home', 'shared'].includes(d['page']) ? '/' : d['page'] === 'catalogue' ? '/bangalore/surgeries' : `/${d['page']}`),
    defaults: { published: true, order: 50, items: [] },
    columns: [
      { key: 'label', label: 'Section' },
      { key: 'page', label: 'Page', format: 'badge' },
      { key: 'section', label: 'Key' },
      { key: 'published', label: 'Published', format: 'bool' },
      { key: 'updatedAt', label: 'Updated', format: 'date' },
    ],
    filters: [
      { key: 'page', label: 'Page', options: { meta: 'contentPages' } },
      { key: 'published', label: 'Published', options: YES_NO },
    ],
    sections: [
      {
        title: 'Section',
        fields: [
          { key: 'label', label: 'Name', type: 'text', required: true },
          { key: 'slug', label: 'Key', type: 'text', createOnly: true },
          { key: 'page', label: 'Page', type: 'lookup', required: true, options: { meta: 'contentPages' }, hint: 'home, shared (homepage + Partner With Us), curxx-plus, for-providers, lab-tests, medicines, privacy, terms, teleconsultation-policy' },
          { key: 'section', label: 'Section key', type: 'text', required: true, hint: 'The page reads this section by page + key; only change it for new sections.' },
          { key: 'title', label: 'Heading', type: 'text', wide: true },
          { key: 'intro', label: 'Intro', type: 'textarea', wide: true },
          { key: 'published', label: 'Published', type: 'boolean' },
          { key: 'order', label: 'Order', type: 'number' },
          {
            key: 'items',
            label: 'Entries',
            type: 'json',
            wide: true,
            hint: 'Keep the shape of the existing entries. FAQs: {"question","answer"} · bands: {"id","eyebrow","heading","body","icon","cta":{"label","href"},"points":[]} · service cards: {"eyebrow","title","body","icon","cta","href"} · steps: {"title","body","footnote"} · legal: {"heading","body"} · badges and searches: plain strings.',
          },
        ],
      },
    ],
  },
  {
    name: 'testimonials',
    label: 'Testimonials',
    singular: 'testimonial',
    icon: 'format_quote',
    group: 'Website',
    key: 'slug',
    canCreate: true,
    canDelete: true,
    description: 'Patient stories on the homepage and doctor stories on For Providers. Publish only real, consented quotes.',
    sitePath: (d) => (d['audience'] === 'provider' ? '/for-providers#testimonials' : '/'),
    defaults: { audience: 'patient', rating: 5, published: true, order: 50 },
    columns: [
      { key: 'name', label: 'Name' },
      { key: 'audience', label: 'Shown to', format: 'badge' },
      { key: 'location', label: 'Line under name' },
      { key: 'rating', label: 'Rating', format: 'stars' },
      { key: 'published', label: 'Published', format: 'bool' },
      { key: 'order', label: 'Order' },
    ],
    filters: [
      { key: 'audience', label: 'Shown to', options: { static: [{ value: 'patient', label: 'Patients (homepage)' }, { value: 'provider', label: 'Doctors (For Providers)' }] } },
      { key: 'published', label: 'Published', options: YES_NO },
    ],
    sections: [
      {
        title: 'Testimonial',
        fields: [
          { key: 'name', label: 'Name', type: 'text', required: true, placeholder: 'Priya Sharma' },
          { key: 'slug', label: 'Key', type: 'text', createOnly: true, hint: 'Leave blank to generate from the name.' },
          { key: 'audience', label: 'Shown to', type: 'select', options: { static: [{ value: 'patient', label: 'Patients (homepage)' }, { value: 'provider', label: 'Doctors (For Providers)' }] } },
          { key: 'initials', label: 'Initials', type: 'text', hint: 'Leave blank to use the name’s initials.' },
          { key: 'location', label: 'Line under the name', type: 'text', placeholder: 'Bengaluru, Karnataka · or · MD Dermatology • Bengaluru' },
          { key: 'city', label: 'City', type: 'select', options: CITY },
          { key: 'rating', label: 'Stars', type: 'select', options: { static: ['5', '4', '3'] } },
          { key: 'doctorSlug', label: 'Doctor (slug, optional)', type: 'text' },
          { key: 'badge.label', label: 'Result chip (doctors)', type: 'text', placeholder: '3.4x Booking Growth' },
          { key: 'badge.icon', label: 'Result chip icon', type: 'text', placeholder: 'trending_up' },
          { key: 'order', label: 'Order', type: 'number' },
          { key: 'published', label: 'Published', type: 'boolean' },
          { key: 'text', label: 'Quote', type: 'textarea', required: true, wide: true },
        ],
      },
    ],
  },
  {
    name: 'plans',
    label: 'Plans & pricing',
    singular: 'plan',
    icon: 'workspace_premium',
    group: 'Website',
    key: 'slug',
    canCreate: true,
    canDelete: true,
    description: 'Curxx Plus plans (for patients) and the software plans on For Providers. Prices show on the website straight away.',
    sitePath: (d) => (d['audience'] === 'provider' ? '/for-providers#pricing' : '/curxx-plus#plans'),
    defaults: { audience: 'plus', period: 'year', published: true, highlight: false, order: 50, perks: [], excluded: [] },
    columns: [
      { key: 'name', label: 'Plan' },
      { key: 'audience', label: 'Page', format: 'badge' },
      { key: 'price', label: 'Price', format: 'money' },
      { key: 'period', label: 'Per' },
      { key: 'highlight', label: 'Highlighted', format: 'bool' },
      { key: 'published', label: 'Published', format: 'bool' },
    ],
    filters: [
      { key: 'audience', label: 'Page', options: { static: [{ value: 'plus', label: 'Curxx Plus' }, { value: 'provider', label: 'For Providers' }] } },
      { key: 'published', label: 'Published', options: YES_NO },
    ],
    sections: [
      {
        title: 'Plan',
        fields: [
          { key: 'name', label: 'Name', type: 'text', required: true },
          { key: 'slug', label: 'Key', type: 'text', createOnly: true },
          { key: 'audience', label: 'Page', type: 'select', options: { static: [{ value: 'plus', label: 'Curxx Plus' }, { value: 'provider', label: 'For Providers' }] } },
          { key: 'price', label: 'Price (₹)', type: 'number', required: true },
          { key: 'period', label: 'Per', type: 'select', options: { static: ['year', 'month', 'forever'] } },
          { key: 'members', label: 'Members line', type: 'text', placeholder: 'Up to 4 members' },
          { key: 'tagline', label: 'Tagline', type: 'text', wide: true },
          { key: 'highlight', label: 'Highlight this plan', type: 'boolean' },
          { key: 'badge', label: 'Badge', type: 'text', placeholder: 'Most popular' },
          { key: 'ctaLabel', label: 'Button label', type: 'text' },
          { key: 'order', label: 'Order', type: 'number' },
          { key: 'published', label: 'Published', type: 'boolean' },
          { key: 'perks', label: 'Included (one per line)', type: 'list', wide: true, hint: 'Wrap words in **double stars** to show them in bold.' },
          { key: 'excluded', label: 'Not included (one per line)', type: 'list', wide: true },
        ],
      },
    ],
  },

  // ---------------------------------------------------------------- Catalogue & URLs
  {
    name: 'cities',
    label: 'Cities & localities',
    singular: 'city',
    icon: 'location_city',
    group: 'Catalogue & URLs',
    key: 'slug',
    canCreate: true,
    canDelete: true,
    description:
      'Cities we serve, with their localities. Each city gets /<city>/doctors, specialty, locality, clinic, lab and surgery pages; a new one works on the website within about 5 minutes. The slug and locality slugs are public URLs — they can’t change once live.',
    sitePath: (d) => `/${d['slug']}/doctors`,
    defaults: { tier: 2, popularOrder: 0, order: 100, aliases: [], pincodePrefixes: [], localities: [] },
    columns: [
      { key: 'name', label: 'City' },
      { key: 'state', label: 'State' },
      { key: 'tier', label: 'Tier' },
      { key: 'popularOrder', label: 'Popular #' },
      { key: 'managed', label: 'Admin-edited', format: 'bool' },
    ],
    filters: [{ key: 'tier', label: 'Tier', options: { static: ['1', '2'] } }],
    sections: [
      {
        title: 'City',
        fields: [
          { key: 'name', label: 'Name', type: 'text', required: true, placeholder: 'Bengaluru' },
          { key: 'slug', label: 'URL slug', type: 'text', createOnly: true, hint: 'Becomes /<slug>/doctors. Leave blank to generate from the name.' },
          { key: 'state', label: 'State', type: 'text', required: true },
          { key: 'council', label: 'State medical council', type: 'text', placeholder: 'KMC' },
          { key: 'tier', label: 'Tier', type: 'select', options: { static: [{ value: '1', label: 'Tier 1 (metro)' }, { value: '2', label: 'Tier 2 — surgery costs shown ~15% lower' }] } },
          { key: 'popularOrder', label: 'Popular city position', type: 'number', hint: '1, 2, 3… lists it first in the city picker and footer. 0 = alphabetical after them.' },
          { key: 'lat', label: 'Latitude (centre)', type: 'number', required: true },
          { key: 'lng', label: 'Longitude (centre)', type: 'number', required: true },
          { key: 'aliases', label: 'Other spellings (redirect here)', type: 'tags', placeholder: 'bengaluru, blr' },
          { key: 'pincodePrefixes', label: 'Pincode prefixes', type: 'tags', placeholder: '560, 561' },
          { key: 'order', label: 'Order', type: 'number' },
          { key: 'localities', label: 'Localities', type: 'json', wide: true, hint: '[{"name":"Indiranagar","pincode":"560038","lat":12.97,"lng":77.64}] — slugs are made from names; keep existing ones unchanged.' },
        ],
      },
    ],
  },
  {
    name: 'conditions',
    label: 'Conditions',
    singular: 'condition',
    icon: 'symptoms',
    group: 'Catalogue & URLs',
    key: 'slug',
    canCreate: true,
    canDelete: true,
    description: 'Conditions with their own treatment page in every city (/<city>/treatment-for-<slug>) and search suggestions. A chip label + position puts one in the homepage “Popular Consultations”.',
    sitePath: (d) => `/bangalore/treatment-for-${d['slug']}`,
    defaults: { popularOrder: 0, order: 100 },
    columns: [
      { key: 'name', label: 'Condition' },
      { key: 'specialty', label: 'Specialty', format: 'badge' },
      { key: 'popular', label: 'Homepage chip' },
      { key: 'popularOrder', label: 'Chip #' },
      { key: 'managed', label: 'Admin-edited', format: 'bool' },
    ],
    filters: [{ key: 'specialty', label: 'Specialty', options: { meta: 'specialties' } }],
    sections: [
      {
        title: 'Condition',
        fields: [
          { key: 'name', label: 'Name', type: 'text', required: true },
          { key: 'slug', label: 'URL slug', type: 'text', createOnly: true, hint: 'Becomes /<city>/treatment-for-<slug>. Can’t change later.' },
          { key: 'specialty', label: 'Treated by', type: 'select', required: true, options: { meta: 'specialties' } },
          { key: 'focus', label: 'Focus area slug', type: 'text', hint: 'One of the specialty’s focus areas, e.g. acne-scars' },
          { key: 'popular', label: 'Homepage chip label', type: 'text', placeholder: 'Skin Acne' },
          { key: 'popularOrder', label: 'Chip position', type: 'number', hint: '1, 2, 3… shows it as a homepage chip. 0 = not shown.' },
          { key: 'order', label: 'Order', type: 'number' },
          { key: 'summary', label: 'Summary', type: 'textarea', wide: true },
          { key: 'symptoms', label: 'Symptoms', type: 'list', wide: true },
          { key: 'causes', label: 'Causes', type: 'list', wide: true },
          { key: 'treatments', label: 'Treatments', type: 'list', wide: true },
          { key: 'selfCare', label: 'Self-care', type: 'list', wide: true },
          { key: 'whenToSee', label: 'When to see a doctor', type: 'list', wide: true },
        ],
      },
    ],
  },
  {
    name: 'surgeries',
    label: 'Surgeries',
    singular: 'surgery',
    icon: 'healing',
    group: 'Catalogue & URLs',
    key: 'slug',
    canCreate: true,
    canDelete: true,
    description: 'Planned surgeries with a page in every city (/<city>/surgery/<slug>): cost range (tier-1 city; tier-2 shown ~15% lower), stay, recovery and the hospitals that do them.',
    sitePath: (d) => `/bangalore/surgery/${d['slug']}`,
    defaults: { icon: 'healing', popular: false, insurance: true, order: 100, durationMinutes: [30, 60], cost: [30000, 60000] },
    columns: [
      { key: 'name', label: 'Surgery' },
      { key: 'category', label: 'Category', format: 'badge' },
      { key: 'specialty', label: 'Specialty' },
      { key: 'popular', label: 'Popular', format: 'bool' },
      { key: 'managed', label: 'Admin-edited', format: 'bool' },
    ],
    filters: [
      { key: 'category', label: 'Category', options: { meta: 'surgeryCategories' } },
      { key: 'specialty', label: 'Specialty', options: { meta: 'specialties' } },
      { key: 'popular', label: 'Popular', options: YES_NO },
    ],
    sections: [
      {
        title: 'Surgery',
        fields: [
          { key: 'name', label: 'Name', type: 'text', required: true },
          { key: 'slug', label: 'URL slug', type: 'text', createOnly: true, hint: 'Becomes /<city>/surgery/<slug>. Can’t change later.' },
          { key: 'category', label: 'Category', type: 'lookup', required: true, options: { meta: 'surgeryCategories' }, hint: 'Pick one, or type a new category (order categories in Page content → catalogue).' },
          { key: 'specialty', label: 'Surgeon specialty', type: 'select', required: true, options: { meta: 'specialties' } },
          { key: 'icon', label: 'Icon', type: 'text' },
          { key: 'popular', label: 'Popular', type: 'boolean' },
          { key: 'insurance', label: 'Usually covered by insurance', type: 'boolean' },
          { key: 'order', label: 'Order', type: 'number' },
          { key: 'cost', label: 'Cost range, tier-1 city (₹)', type: 'json', hint: '[35000, 75000]' },
          { key: 'durationMinutes', label: 'Procedure time (minutes)', type: 'json', hint: '[20, 40]' },
          { key: 'stay', label: 'Hospital stay', type: 'text', placeholder: 'Day care' },
          { key: 'recovery', label: 'Recovery', type: 'text' },
          { key: 'anaesthesia', label: 'Anaesthesia', type: 'text', wide: true },
          { key: 'description', label: 'Description', type: 'textarea', wide: true },
          { key: 'treats', label: 'Treats', type: 'list', wide: true },
          { key: 'techniques', label: 'Techniques', type: 'list', wide: true },
          { key: 'steps', label: 'Steps', type: 'list', wide: true },
          { key: 'benefits', label: 'Benefits', type: 'list', wide: true },
          { key: 'risks', label: 'Risks', type: 'list', wide: true },
          { key: 'departments', label: 'Hospital departments that do it', type: 'tags', wide: true },
        ],
      },
    ],
  },
];

export const RESOURCE_BY_NAME = new Map(RESOURCES.map((r) => [r.name, r]));
export const GROUPS = [...new Set(RESOURCES.map((r) => r.group))];

/** Options for a select/filter, resolved against the meta payload. */
export function optionsFor(source: OptionSource | undefined, meta: Meta | null): { value: string; label: string }[] {
  if (!source) return [];
  if ('static' in source) return source.static.map((o) => (typeof o === 'string' ? { value: o, label: o } : o));
  if (!meta) return [];
  switch (source.meta) {
    case 'cities':
      return meta.cities.map((c) => ({ value: c.slug, label: c.name }));
    case 'specialties':
      return meta.specialties.map((s) => ({ value: s.slug, label: s.name }));
    case 'facilities':
      return meta.facilities.map((f) => ({ value: f.slug, label: `${f.name} — ${f.area}, ${f.city}` }));
    case 'facilityTypes':
      return meta.facilityTypes.map((t) => ({ value: t.name, label: t.name }));
    case 'labCategories':
      return meta.labCategories.map((c) => ({ value: c.slug, label: c.name }));
    case 'medicineCategories':
      return meta.medicineCategories.map((c) => ({ value: c.slug, label: c.name }));
    case 'specialtyCategories':
      return meta.specialtyCategories.map((c) => ({ value: c, label: c }));
    case 'articleCategories':
      return meta.articleCategories.map((c) => ({ value: c, label: c }));
    case 'conditions':
      return meta.conditions.map((c) => ({ value: c.slug, label: c.name }));
    case 'surgeryCategories':
      return meta.surgeryCategories.map((c) => ({ value: c, label: c }));
    case 'contentPages':
      return meta.contentPages.map((c) => ({ value: c, label: c }));
    case 'settingGroups':
      return meta.settingGroups.map((c) => ({ value: c, label: c }));
  }
}

/** Reads a dotted path, e.g. getPath(doc, 'geo.lat'). */
export function getPath(doc: Doc, path: string): any {
  return path.split('.').reduce<any>((v, k) => (v == null ? undefined : v[k]), doc);
}

/** Writes a dotted path, creating objects on the way. */
export function setPath(doc: Doc, path: string, value: unknown) {
  const keys = path.split('.');
  let target = doc;
  for (const k of keys.slice(0, -1)) {
    if (target[k] == null || typeof target[k] !== 'object') target[k] = {};
    target = target[k];
  }
  target[keys.at(-1)!] = value;
}
