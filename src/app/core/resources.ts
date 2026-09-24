import type { Doc, Meta } from './api';

/** Where a select's options come from: a fixed list, or the /admin/meta payload. */
export type OptionSource =
  | { static: (string | { value: string; label: string })[] }
  | { meta: 'cities' | 'specialties' | 'facilities' | 'facilityTypes' | 'labCategories' | 'medicineCategories' | 'specialtyCategories' | 'articleCategories' | 'conditions' };

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

export type Column = { key: string; label: string; format?: 'money' | 'date' | 'datetime' | 'bool' | 'badge' | 'stars' };

export type Filter = { key: string; label: string; options: OptionSource };

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
      { key: 'mode', label: 'Mode', format: 'badge' },
      { key: 'amount', label: 'Amount', format: 'money' },
      { key: 'status', label: 'Status', format: 'badge' },
    ],
    filters: [
      { key: 'status', label: 'Status', options: { static: ['confirmed', 'completed', 'cancelled'] } },
      { key: 'mode', label: 'Mode', options: { static: ['clinic', 'video'] } },
    ],
    sections: [
      {
        title: 'Booking',
        fields: [
          { key: 'reference', label: 'Reference', type: 'text', readonly: true },
          { key: 'doctorSlug', label: 'Doctor', type: 'text', readonly: true },
          { key: 'startsAt', label: 'When', type: 'text', readonly: true },
          { key: 'mode', label: 'Mode', type: 'text', readonly: true },
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
      { key: 'abhaId', label: 'ABHA' },
      { key: 'createdAt', label: 'Joined', format: 'date' },
    ],
    filters: [{ key: 'gender', label: 'Gender', options: { static: ['female', 'male', 'other'] } }],
    sections: [
      {
        title: 'Account',
        fields: [
          { key: 'phone', label: 'Mobile', type: 'text', readonly: true },
          { key: 'abhaId', label: 'ABHA ID', type: 'text', readonly: true },
          { key: 'name', label: 'Name', type: 'text' },
          { key: 'email', label: 'Email', type: 'text' },
          { key: 'gender', label: 'Gender', type: 'select', options: { static: ['female', 'male', 'other'] } },
          { key: 'bloodGroup', label: 'Blood group', type: 'select', options: { static: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'] } },
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
