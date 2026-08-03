'use client'

import { Suspense, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Plus, X, Check, ChevronsUpDown } from 'lucide-react'
import { FieldInfoTip, RULE_FIELD_TOOLTIPS } from '@/components/pricing-rules/field-info-tip'
import { PricingRulesProvider, usePricingRules } from '@/lib/pricing-rules-context'
import type { PricingRule } from '@/lib/pricing-rules-data'
import {
  createBlankRule,
  LENDERS,
  PROPERTY_TYPES,
  PROPERTY_USAGE,
  LOAN_TYPES,
  QUOTING_CHANNELS,
  LOCK_PERIODS,
  BORROWER_FILTERS,
  POINT_GROUPS,
  STATES,
  PRODUCT_FAMILIES,
  PRODUCT_CLASSES,
  PRODUCT_TYPES,
  PRODUCT_TERMS,
  FEE_SETS,
  MI_COMPANIES,
} from '@/lib/pricing-rules-data'
import { cn } from '@/lib/utils'

// ── Shared helpers (mirrored from edit-rule-dialog) ───────────────────────────

interface MultiSelectProps {
  label: string
  options: string[]
  selected: string[]
  onChange: (v: string[]) => void
  info?: string
}

function MultiSelect({ label, options, selected, onChange, info }: MultiSelectProps) {
  const [open, setOpen] = useState(false)
  const allSelected = selected.length === options.length
  const toggle = (opt: string) =>
    selected.includes(opt) ? onChange(selected.filter(s => s !== opt)) : onChange([...selected, opt])
  const toggleAll = () => onChange(allSelected ? [] : [...options])

  return (
    <div className="flex flex-col gap-1.5 w-full sm:w-auto sm:min-w-[200px]">
      <div className="flex items-center gap-1">
        <span className="text-sm font-semibold text-gray-700">{label}</span>
        {info && <FieldInfoTip content={info} />}
      </div>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            role="combobox"
            aria-expanded={open}
            className={cn(
              'flex min-h-[40px] w-full items-start gap-1.5 flex-wrap rounded-md border border-input bg-white px-3 py-2 text-sm text-left transition-colors hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0157FF] focus:ring-offset-0',
              open && 'border-[#0157FF] ring-2 ring-[#0157FF]'
            )}
          >
            {selected.length === 0 ? (
              <span className="text-gray-400 self-center">Select options...</span>
            ) : (
              selected.map(s => (
                <span
                  key={s}
                  className="inline-flex items-center gap-1 bg-gray-100 text-gray-800 text-xs font-medium px-2 py-0.5 rounded-full"
                >
                  {s}
                  <span
                    role="button"
                    tabIndex={0}
                    aria-label={`Remove ${s}`}
                    onKeyDown={e => e.key === 'Enter' && (e.stopPropagation(), toggle(s))}
                    onClick={e => { e.stopPropagation(); toggle(s) }}
                    className="ml-0.5 hover:text-gray-900 cursor-pointer"
                  >
                    <X className="h-3 w-3" />
                  </span>
                </span>
              ))
            )}
            <ChevronsUpDown className="h-4 w-4 text-gray-400 ml-auto self-center shrink-0" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="p-0 w-[240px]" align="start">
          <Command>
            <CommandInput placeholder={`Search ${label.toLowerCase()}...`} />
            <CommandList>
              <CommandGroup>
                <CommandItem
                  key="__select_all__"
                  value="Select all"
                  onSelect={toggleAll}
                  className="cursor-pointer font-medium border-b border-gray-100"
                >
                  <Check className={cn('h-4 w-4 shrink-0', allSelected ? 'opacity-100 text-[#0157FF]' : 'opacity-0')} />
                  Select all
                </CommandItem>
                {options.map(opt => (
                  <CommandItem
                    key={opt}
                    value={opt}
                    onSelect={() => toggle(opt)}
                    className="cursor-pointer"
                  >
                    <Check className={cn('h-4 w-4 shrink-0', selected.includes(opt) ? 'opacity-100 text-[#0157FF]' : 'opacity-0')} />
                    {opt}
                  </CommandItem>
                ))}
              </CommandGroup>
              <CommandEmpty>No results found.</CommandEmpty>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  )
}

// ── Inner content ─────────────────────────────────────────────────────────────

// Pill toggle for filter criteria
type FilterKey = 'ltv' | 'fico' | 'loanAmount' | 'propertyTypes' | 'propertyUsage' | 'loanTypes' | 'quotingChannels' | 'lockPeriod' | 'borrowerFilters' | 'pointGroups' | 'states'
type ProgramKey = 'lenders' | 'productFamilies' | 'productClasses' | 'productTypes' | 'productTerms'

const RULE_FILTER_GROUPS: { heading: string; filters: { key: FilterKey; label: string }[] }[] = [
  {
    heading: 'Loan & credit ranges',
    filters: [
      { key: 'ltv', label: 'LTV' },
      { key: 'fico', label: 'FICO' },
      { key: 'loanAmount', label: 'Loan Amount' },
    ],
  },
  {
    heading: 'Property, channel & lock',
    filters: [
      { key: 'propertyTypes', label: 'Property Types' },
      { key: 'propertyUsage', label: 'Property Usage' },
      { key: 'loanTypes', label: 'Loan Purposes' },
      { key: 'quotingChannels', label: 'Quoting Channels' },
      { key: 'lockPeriod', label: 'Lock Periods' },
    ],
  },
  {
    heading: 'Borrower & geography',
    filters: [
      { key: 'borrowerFilters', label: 'Borrower Filters' },
      { key: 'pointGroups', label: 'Point Groups' },
      { key: 'states', label: 'States' },
    ],
  },
]

const PROGRAM_FILTERS: { key: ProgramKey; label: string }[] = [
  { key: 'lenders', label: 'Lenders' },
  { key: 'productFamilies', label: 'Product Families' },
  { key: 'productClasses', label: 'Product Classes' },
  { key: 'productTypes', label: 'Product Types' },
  { key: 'productTerms', label: 'Product Terms' },
]

/** Sample counties by state display label — mirrors Loantek “one state → counties” behavior. */
const SAMPLE_COUNTIES_BY_STATE: Record<string, string[]> = {
  'Alabama (AL)': ['Jefferson', 'Mobile', 'Madison', 'Montgomery', 'Tuscaloosa', 'Baldwin', 'Shelby'],
  'Alaska (AK)': ['Anchorage', 'Fairbanks North Star', 'Matanuska-Susitna', 'Kenai Peninsula', 'Juneau'],
  'Arizona (AZ)': ['Maricopa', 'Pima', 'Pinal', 'Yavapai', 'Mohave', 'Coconino', 'Yuma'],
  'Arkansas (AR)': ['Pulaski', 'Benton', 'Washington', 'Faulkner', 'Sebastian', 'Saline'],
  'California (CA)': ['Los Angeles', 'San Diego', 'Orange', 'Riverside', 'San Bernardino', 'Santa Clara', 'Alameda', 'Sacramento', 'Contra Costa', 'Fresno', 'San Francisco', 'Ventura'],
  'Colorado (CO)': ['Denver', 'El Paso', 'Arapahoe', 'Jefferson', 'Adams', 'Douglas', 'Larimer', 'Boulder'],
  'Connecticut (CT)': ['Fairfield', 'Hartford', 'New Haven', 'New London', 'Litchfield', 'Middlesex', 'Tolland', 'Windham'],
  'Delaware (DE)': ['New Castle', 'Kent', 'Sussex'],
  'District of Columbia (DC)': ['District of Columbia'],
  'Florida (FL)': ['Miami-Dade', 'Broward', 'Palm Beach', 'Hillsborough', 'Orange', 'Pinellas', 'Duval', 'Lee', 'Polk', 'Brevard'],
  'Georgia (GA)': ['Fulton', 'Gwinnett', 'Cobb', 'DeKalb', 'Clayton', 'Cherokee', 'Henry', 'Forsyth'],
  'Hawaii (HI)': ['Honolulu', 'Hawaii', 'Maui', 'Kauai', 'Kalawao'],
  'Idaho (ID)': ['Ada', 'Canyon', 'Kootenai', 'Bonneville', 'Twin Falls', 'Bannock'],
  'Illinois (IL)': ['Cook', 'DuPage', 'Lake', 'Will', 'Kane', 'McHenry', 'Winnebago', 'St. Clair'],
  'Indiana (IN)': ['Marion', 'Lake', 'Allen', 'Hamilton', 'St. Joseph', 'Elkhart', 'Tippecanoe'],
  'Iowa (IA)': ['Polk', 'Linn', 'Scott', 'Johnson', 'Black Hawk', 'Woodbury', 'Dubuque'],
  'Kansas (KS)': ['Johnson', 'Sedgwick', 'Shawnee', 'Wyandotte', 'Douglas', 'Leavenworth'],
  'Kentucky (KY)': ['Jefferson', 'Fayette', 'Kenton', 'Boone', 'Warren', 'Hardin', 'Campbell'],
  'Louisiana (LA)': ['East Baton Rouge', 'Jefferson', 'Orleans', 'St. Tammany', 'Lafayette', 'Caddo'],
  'Maine (ME)': ['Cumberland', 'York', 'Penobscot', 'Kennebec', 'Androscoggin', 'Aroostook'],
  'Maryland (MD)': ['Montgomery', 'Prince George\'s', 'Baltimore', 'Anne Arundel', 'Howard', 'Baltimore City', 'Frederick'],
  'Massachusetts (MA)': ['Middlesex', 'Worcester', 'Essex', 'Suffolk', 'Norfolk', 'Bristol', 'Plymouth', 'Hampden'],
  'Michigan (MI)': ['Wayne', 'Oakland', 'Macomb', 'Kent', 'Genesee', 'Washtenaw', 'Ottawa', 'Ingham'],
  'Minnesota (MN)': ['Hennepin', 'Ramsey', 'Dakota', 'Anoka', 'Washington', 'St. Louis', 'Stearns'],
  'Mississippi (MS)': ['Hinds', 'Harrison', 'DeSoto', 'Rankin', 'Jackson', 'Madison', 'Lee'],
  'Missouri (MO)': ['St. Louis', 'Jackson', 'St. Charles', 'St. Louis City', 'Greene', 'Clay', 'Jefferson'],
  'Montana (MT)': ['Yellowstone', 'Missoula', 'Gallatin', 'Flathead', 'Cascade', 'Lewis and Clark'],
  'Nebraska (NE)': ['Douglas', 'Lancaster', 'Sarpy', 'Hall', 'Buffalo', 'Dodge'],
  'Nevada (NV)': ['Clark', 'Washoe', 'Carson City', 'Lyon', 'Elko', 'Nye', 'Douglas'],
  'New Hampshire (NH)': ['Hillsborough', 'Rockingham', 'Merrimack', 'Strafford', 'Grafton', 'Cheshire'],
  'New Jersey (NJ)': ['Bergen', 'Middlesex', 'Essex', 'Hudson', 'Monmouth', 'Ocean', 'Union', 'Camden', 'Passaic', 'Morris'],
  'New Mexico (NM)': ['Bernalillo', 'Doña Ana', 'Santa Fe', 'Sandoval', 'San Juan', 'Valencia'],
  'New York (NY)': ['Kings', 'Queens', 'New York', 'Suffolk', 'Bronx', 'Nassau', 'Westchester', 'Erie', 'Monroe', 'Richmond'],
  'North Carolina (NC)': ['Mecklenburg', 'Wake', 'Guilford', 'Forsyth', 'Cumberland', 'Durham', 'Buncombe'],
  'North Dakota (ND)': ['Cass', 'Burleigh', 'Grand Forks', 'Ward', 'Morton', 'Stark'],
  'Ohio (OH)': ['Franklin', 'Cuyahoga', 'Hamilton', 'Summit', 'Montgomery', 'Lucas', 'Butler', 'Stark'],
  'Oklahoma (OK)': ['Oklahoma', 'Tulsa', 'Cleveland', 'Canadian', 'Comanche', 'Rogers'],
  'Oregon (OR)': ['Multnomah', 'Washington', 'Clackamas', 'Lane', 'Marion', 'Jackson', 'Deschutes'],
  'Pennsylvania (PA)': ['Philadelphia', 'Allegheny', 'Montgomery', 'Bucks', 'Delaware', 'Lancaster', 'Chester'],
  'Rhode Island (RI)': ['Providence', 'Kent', 'Washington', 'Newport', 'Bristol'],
  'South Carolina (SC)': ['Greenville', 'Richland', 'Charleston', 'Horry', 'Spartanburg', 'Lexington', 'York'],
  'South Dakota (SD)': ['Minnehaha', 'Pennington', 'Lincoln', 'Brown', 'Brookings', 'Codington'],
  'Tennessee (TN)': ['Shelby', 'Davidson', 'Knox', 'Hamilton', 'Rutherford', 'Williamson', 'Montgomery'],
  'Texas (TX)': ['Harris', 'Dallas', 'Tarrant', 'Bexar', 'Travis', 'Collin', 'Denton', 'Fort Bend', 'Hidalgo', 'El Paso'],
  'Utah (UT)': ['Salt Lake', 'Utah', 'Davis', 'Weber', 'Washington', 'Cache', 'Tooele'],
  'Vermont (VT)': ['Chittenden', 'Rutland', 'Washington', 'Windsor', 'Franklin', 'Windham'],
  'Virginia (VA)': ['Fairfax', 'Prince William', 'Virginia Beach', 'Loudoun', 'Chesterfield', 'Henrico', 'Arlington'],
  'Washington (WA)': ['King', 'Pierce', 'Snohomish', 'Spokane', 'Clark', 'Thurston', 'Kitsap', 'Yakima'],
  'West Virginia (WV)': ['Kanawha', 'Berkeley', 'Monongalia', 'Cabell', 'Wood', 'Raleigh'],
  'Wisconsin (WI)': ['Milwaukee', 'Dane', 'Waukesha', 'Brown', 'Racine', 'Outagamie', 'Winnebago'],
  'Wyoming (WY)': ['Laramie', 'Natrona', 'Campbell', 'Sweetwater', 'Fremont', 'Albany'],
}

function getCountiesForState(state: string): string[] {
  return SAMPLE_COUNTIES_BY_STATE[state] ?? []
}

const BLANK_DEFAULTS = createBlankRule(0)

function getActiveFiltersFromRule(rule: PricingRule): Set<FilterKey> {
  const active = new Set<FilterKey>()
  if (rule.LTVMin !== BLANK_DEFAULTS.LTVMin || rule.LTVMax !== BLANK_DEFAULTS.LTVMax) active.add('ltv')
  if (rule.FICOMin !== BLANK_DEFAULTS.FICOMin || rule.FICOMax !== BLANK_DEFAULTS.FICOMax) active.add('fico')
  if (rule.LoanAmountMin !== BLANK_DEFAULTS.LoanAmountMin || rule.LoanAmountMax !== BLANK_DEFAULTS.LoanAmountMax) active.add('loanAmount')
  if (rule.PropertyTypes.length) active.add('propertyTypes')
  if (rule.PropertyUsage.length) active.add('propertyUsage')
  if (rule.LoanTypes.length) active.add('loanTypes')
  if (rule.QuotingChannels.length) active.add('quotingChannels')
  if (rule.LockPeriods.length) active.add('lockPeriod')
  if (rule.BorrowerFilters.length) active.add('borrowerFilters')
  if (rule.PointGroups.length) active.add('pointGroups')
  if (rule.States.length) active.add('states')
  return active
}

function getActiveProgramsFromRule(rule: PricingRule): Set<ProgramKey> {
  const active = new Set<ProgramKey>()
  if (rule.Lenders.length) active.add('lenders')
  if (rule.ProductFamilies.length) active.add('productFamilies')
  if (rule.ProductClasses.length) active.add('productClasses')
  if (rule.ProductTypes.length) active.add('productTypes')
  if (rule.ProductTerms.length) active.add('productTerms')
  return active
}

function ruleHasSchedule(rule: PricingRule): boolean {
  return !!(rule.StartDate || rule.EndDate || rule.StartTime || rule.EndTime)
}

function FilterPill({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-sm font-medium transition-colors',
        active
          ? 'bg-[#0157FF] border-[#0157FF] text-white hover:bg-blue-700'
          : 'bg-white border-gray-300 text-gray-700 hover:border-gray-400'
      )}
    >
      {active ? <X className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
      {label}
    </button>
  )
}

function AccordionSectionHeader({
  checked,
  onCheckedChange,
  title,
  subtitle,
  tooltip,
}: {
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  title: string
  subtitle: string
  tooltip: string
}) {
  return (
    <div className="flex items-start gap-3 px-6 py-5">
      <Checkbox
        id={`accordion-${title}`}
        checked={checked}
        onCheckedChange={v => onCheckedChange(v === true)}
        className="mt-1"
      />
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <label htmlFor={`accordion-${title}`} className="text-base font-bold text-gray-900 cursor-pointer">
            {title}
          </label>
          <span className="text-sm text-gray-600">(optional)</span>
          <FieldInfoTip content={tooltip} />
        </div>
        {!checked && (
          <p className="text-sm text-gray-600 mt-0.5">{subtitle}</p>
        )}
      </div>
    </div>
  )
}

function NewRuleContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { stageCreate, stageUpdate, getRuleWithDraft, getDraftForRule } = usePricingRules()

  const ruleIdParam = searchParams.get('ruleId')
  const ruleId = ruleIdParam ? Number.parseInt(ruleIdParam, 10) : NaN
  const isEdit = Number.isFinite(ruleId)

  const initialRule = useMemo(() => {
    if (!isEdit) return createBlankRule(-Date.now())
    return { ...getRuleWithDraft(ruleId) }
    // Only resolve once on mount for the given ruleId
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEdit, ruleId])

  const originalRule = useMemo(() => {
    if (!isEdit) return null
    return getDraftForRule(ruleId)?.originalRule ?? getRuleWithDraft(ruleId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEdit, ruleId])

  const [formData, setFormData] = useState<PricingRule>(() => initialRule)
  const [filtersEnabled, setFiltersEnabled] = useState(() =>
    isEdit && (getActiveFiltersFromRule(initialRule).size > 0 || getActiveProgramsFromRule(initialRule).size > 0)
  )
  const [activeFilters, setActiveFilters] = useState<Set<FilterKey>>(() =>
    isEdit ? getActiveFiltersFromRule(initialRule) : new Set()
  )
  const [activePrograms, setActivePrograms] = useState<Set<ProgramKey>>(() =>
    isEdit ? getActiveProgramsFromRule(initialRule) : new Set()
  )
  const [scheduleEnabled, setScheduleEnabled] = useState(() => isEdit && ruleHasSchedule(initialRule))

  const update = <K extends keyof PricingRule>(field: K, value: PricingRule[K]) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const allFilterKeys: FilterKey[] = ['ltv', 'fico', 'loanAmount', 'propertyTypes', 'propertyUsage', 'loanTypes', 'quotingChannels', 'lockPeriod', 'borrowerFilters', 'pointGroups', 'states']
  const allProgramKeys: ProgramKey[] = ['lenders', 'productFamilies', 'productClasses', 'productTypes', 'productTerms']

  const allFiltersActive = allFilterKeys.every(k => activeFilters.has(k))
  const allProgramsActive = allProgramKeys.every(k => activePrograms.has(k))

  const toggleFilter = (key: FilterKey) => setActiveFilters(prev => {
    const next = new Set(prev); next.has(key) ? next.delete(key) : next.add(key); return next
  })

  const toggleAllFilters = () => setActiveFilters(allFiltersActive ? new Set() : new Set(allFilterKeys))

  const toggleProgram = (key: ProgramKey) => setActivePrograms(prev => {
    const next = new Set(prev); next.has(key) ? next.delete(key) : next.add(key); return next
  })

  const toggleAllPrograms = () => setActivePrograms(allProgramsActive ? new Set() : new Set(allProgramKeys))

  const handleSave = () => {
    if (isEdit && originalRule) {
      stageUpdate(originalRule, formData)
    } else {
      stageCreate(formData)
    }
    router.push('/')
  }

  const pageTitle = isEdit
    ? `Pricing Rules: Edit (${formData.RuleId})`
    : 'Pricing Rules: New'

  const programs = [
    { id: 0, lender: 'Achieve', program: 'Home Equity Loan - Fixed 20 Year', family: 'HOMEEQUITY', cls: 'EQUITY', type: 'FIXED', term: '20' },
    { id: 1, lender: 'Ally2 - Conforming', program: 'FNMA 15 Year Fixed - High Balance', family: 'CONVENTIONAL', cls: 'HIGH BALANCE', type: 'FIXED', term: '15' },
    { id: 2, lender: 'Ally2 - Conforming', program: 'FNMA 20 Year Fixed - High Balance', family: 'CONVENTIONAL', cls: 'HIGH BALANCE', type: 'FIXED', term: '20' },
    { id: 3, lender: 'Ally2 - Conforming', program: 'FNMA 30 Year Fixed - High Balance', family: 'CONVENTIONAL', cls: 'HIGH BALANCE', type: 'FIXED', term: '30' },
    { id: 4, lender: 'Ally2 - Conforming', program: 'FNMA 10/6 ARM', family: 'CONVENTIONAL', cls: 'STANDARD', type: 'ARM', term: '10/6' },
  ]
  const allProgramsSelected = formData.SelectedPrograms?.length === programs.length
  const someProgramsSelected = (formData.SelectedPrograms?.length ?? 0) > 0 && !allProgramsSelected
  const toggleAllProgramRows = () => update('SelectedPrograms', allProgramsSelected ? [] : programs.map(p => p.id))
  const toggleProgramRow = (id: number) => {
    const current: number[] = formData.SelectedPrograms ?? []
    update('SelectedPrograms', current.includes(id) ? current.filter(i => i !== id) : [...current, id])
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top nav */}
      <div className="bg-white border-b border-gray-200 px-4 sm:px-6 py-4">
        <div className="flex items-center gap-3 sm:gap-4">
          <img src="/loantek-logo.webp" alt="LoanTek" className="h-7 sm:h-8 shrink-0" />
          <div className="h-8 w-px bg-gray-300 shrink-0" />
          <div className="min-w-0">
            <h1 className="text-lg sm:text-xl font-semibold text-gray-900">{pageTitle}</h1>
            <p className="text-xs sm:text-sm text-gray-600">Configure rule details, criteria, and schedule.</p>
          </div>
        </div>
      </div>

      {/* Page content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6 sm:space-y-8">

        {/* ── Apply these rules ─────────────────────────────────────────── */}
        <section className="bg-white border border-gray-200 rounded-lg p-4 sm:p-8 space-y-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Apply these rules</h2>
            <p className="text-sm text-gray-500 mt-1">Define the description and the pricing or fee changes for this rule.</p>
          </div>

          {/* Description + Disallow */}
          <div className="space-y-2">
            <div className="flex items-center gap-1">
              <Label className="text-xs font-semibold text-gray-700">
                Enter a brief description to identify the rule in your pricing adjustments
              </Label>
              <FieldInfoTip content={RULE_FIELD_TOOLTIPS.description} />
            </div>
            <div className="flex items-center gap-3">
              <div className="flex-1 space-y-1">
                <Input
                  value={formData.RuleDescription}
                  onChange={e => update('RuleDescription', e.target.value)}
                  placeholder="Describe this rule"
                  className="w-full"
                />
              </div>
              <label className="flex items-center gap-1.5 shrink-0 self-start mt-1 cursor-pointer text-sm text-gray-700">
                <Checkbox checked={formData.Disallow} onCheckedChange={c => update('Disallow', c === true)} />
                Disallow
                <FieldInfoTip content={RULE_FIELD_TOOLTIPS.disallow} />
              </label>
            </div>
          </div>

          {/* Lock Period / Fee Set / MI Company */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-1">
                <Label className="text-xs font-semibold text-gray-700">Lock period</Label>
                <FieldInfoTip content={RULE_FIELD_TOOLTIPS.lockPeriod} />
              </div>
              <Select value={formData.LockPeriod?.toString() || ''} onValueChange={v => update('LockPeriod', parseInt(v))}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>{LOCK_PERIODS.map(p => <SelectItem key={p} value={p.toString()}>{p} Days</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-1">
                <Label className="text-xs font-semibold text-gray-700">Fee Set</Label>
                <FieldInfoTip content={RULE_FIELD_TOOLTIPS.feeSet} />
              </div>
              <Select value={formData.FeeSet} onValueChange={v => update('FeeSet', v)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>{FEE_SETS.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-gray-700">MI Company</Label>
              <Select value={formData.MICompany || 'none'} onValueChange={v => update('MICompany', v === 'none' ? '' : v)}>
                <SelectTrigger className="w-full"><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {MI_COMPANIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Price / Rate / Fees */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-gray-700">Price</Label>
              <Input type="number" step="0.001" value={formData.Price} onChange={e => update('Price', parseFloat(e.target.value) || 0)} placeholder="Price" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-gray-700">Rate</Label>
              <Input value={formData.Rate} onChange={e => update('Rate', e.target.value)} placeholder="Rate" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-gray-700">Fees</Label>
              <Input type="number" step="0.01" value={formData.Fee} onChange={e => update('Fee', parseFloat(e.target.value) || 0)} placeholder="Fees" />
            </div>
          </div>

          {/* Margin Type */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold text-gray-700">Margin Type</Label>
            <RadioGroup value={formData.MarginType} onValueChange={v => update('MarginType', v as 'percentage' | 'flat')} className="flex gap-6">
              <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-700">
                <RadioGroupItem value="percentage" /> Percentage margin
              </label>
              <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-700">
                <RadioGroupItem value="flat" /> Flat fee margin
              </label>
            </RadioGroup>
          </div>

          {/* Margin inputs — differ by margin type */}
          {formData.MarginType === 'percentage' ? (
            /* Percentage: Comp %  +  Comp Min $  to  Comp Max $ */
            <div className="flex flex-col sm:flex-row sm:items-end gap-3">
              <div className="space-y-1 flex-1">
                <div className="flex items-center gap-1">
                  <Label className="text-xs font-semibold text-gray-700">Comp %</Label>
                  <FieldInfoTip content={RULE_FIELD_TOOLTIPS.compPercent} />
                </div>
                <Input type="number" step="0.001" value={formData.CompPercent || ''} onChange={e => update('CompPercent', parseFloat(e.target.value) || 0)} placeholder="Comp %" />
              </div>
              <span className="hidden sm:block text-gray-500 text-sm pb-2.5">+</span>
              <div className="space-y-1 flex-1">
                <Label className="text-xs font-semibold text-gray-700">Comp Min $</Label>
                <Input type="number" step="0.01" value={formData.CompMin || ''} onChange={e => update('CompMin', parseFloat(e.target.value) || 0)} placeholder="Comp Min $" />
              </div>
              <span className="hidden sm:block text-gray-500 text-sm pb-2.5">to</span>
              <div className="space-y-1 flex-1">
                <Label className="text-xs font-semibold text-gray-700">Comp Max $</Label>
                <Input type="number" step="0.01" value={formData.CompMax || ''} onChange={e => update('CompMax', parseFloat(e.target.value) || 0)} placeholder="Comp Max $" />
              </div>
            </div>
          ) : (
            /* Flat fee: Comp Flat Fee / Final Price MIN / Final Price MAX */
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-gray-700">Comp Flat Fee</Label>
                <Input type="number" step="0.01" value={formData.CompFlatFee || ''} onChange={e => update('CompFlatFee', parseFloat(e.target.value) || 0)} placeholder="Comp Flat Fee" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-gray-700">Final Price MIN</Label>
                <Input type="number" step="0.001" value={formData.FinalPriceMin} onChange={e => update('FinalPriceMin', parseFloat(e.target.value) || 0)} />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-1">
                  <Label className="text-xs font-semibold text-gray-700">Final Price MAX</Label>
                  <FieldInfoTip content={RULE_FIELD_TOOLTIPS.finalPriceMax} />
                </div>
                <Input type="number" step="0.001" value={formData.FinalPriceMax} onChange={e => update('FinalPriceMax', parseFloat(e.target.value) || 0)} />
              </div>
            </div>
          )}

          {/* Checkboxes */}
          <div className="flex flex-wrap gap-x-8 gap-y-3">
            <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-700">
              <Checkbox checked={formData.HasSecondMortgage} onCheckedChange={c => update('HasSecondMortgage', c === true)} /> Has second mortgage?
            </label>
            <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-700">
              <Checkbox checked={formData.IgnoreNonEighthRates} onCheckedChange={c => update('IgnoreNonEighthRates', c === true)} /> Ignore Non Eighth Rates (e.g. 3.490)?
            </label>
          </div>
          <div className="flex flex-wrap gap-x-8 gap-y-3">
            <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-700">
              <Checkbox checked={formData.IncludeUFMIP} onCheckedChange={c => update('IncludeUFMIP', c === true)} /> Include UFMIP on FHA/VA in cash to borrower?
            </label>
          </div>

          {/* Max Cash Back */}
          <div className="flex items-end gap-4">
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-gray-700">Max Cash Back to Borrower</Label>
              <div className="flex items-center gap-2">
                <Input type="number" step="0.01" className="w-36" value={formData.MaxCashBack} onChange={e => update('MaxCashBack', parseFloat(e.target.value) || 0)} />
                <FieldInfoTip content={RULE_FIELD_TOOLTIPS.maxCashBack} iconClassName="h-4 w-4 text-blue-500" />
              </div>
            </div>
            <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-700 mb-0.5">
              <Checkbox checked={formData.FinanceUFMIP} onCheckedChange={c => update('FinanceUFMIP', c === true)} /> Finance UFMIP on FHA/VA?
            </label>
          </div>
        </section>

        {/* ── Optional accordion sections ───────────────────────────────── */}
        <section className="space-y-6">
          {/* Apply filters to rule */}
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <AccordionSectionHeader
              checked={filtersEnabled}
              onCheckedChange={setFiltersEnabled}
              title="Apply filters to rule"
              subtitle="e.g. LTV, FICO, Loan amount"
              tooltip={RULE_FIELD_TOOLTIPS.applyFilters}
            />

            {filtersEnabled && (
              <div className="px-6 pb-6 space-y-8 border-t border-gray-100 pt-5">
                {/* Rule filters */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="text-base font-bold text-gray-900">Rule filters</h3>
                    <button
                      type="button"
                      onClick={toggleAllFilters}
                      className="text-sm text-[#0157FF] hover:underline font-medium"
                    >
                      {allFiltersActive ? 'Deselect all' : 'Select all'}
                    </button>
                  </div>

                  <div className="space-y-5">
                    {RULE_FILTER_GROUPS.map(group => {
                      const activeInGroup = group.filters.filter(({ key }) => activeFilters.has(key))
                      return (
                        <div key={group.heading} className="space-y-2">
                          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                            {group.heading}
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {group.filters.map(({ key, label }) => (
                              <FilterPill
                                key={key}
                                label={label}
                                active={activeFilters.has(key)}
                                onClick={() => toggleFilter(key)}
                              />
                            ))}
                          </div>
                          {activeInGroup.length > 0 && (
                            <div className="flex flex-wrap gap-4 pt-1">
                              {activeInGroup.map(({ key }) => {
                                if (key === 'ltv') {
                                  return (
                                    <div key={key} className="space-y-1">
                                      <Label className="text-xs font-semibold text-gray-700">LTV</Label>
                                      <div className="flex items-center gap-2">
                                        <Input type="number" placeholder="Min" className="w-24" value={formData.LTVMin} onChange={e => update('LTVMin', parseFloat(e.target.value) || 0)} />
                                        <span className="text-gray-400 text-sm">to</span>
                                        <Input type="number" placeholder="Max" className="w-24" value={formData.LTVMax} onChange={e => update('LTVMax', parseFloat(e.target.value) || 0)} />
                                      </div>
                                    </div>
                                  )
                                }
                                if (key === 'fico') {
                                  return (
                                    <div key={key} className="space-y-1">
                                      <Label className="text-xs font-semibold text-gray-700">FICO</Label>
                                      <div className="flex items-center gap-2">
                                        <Input type="number" placeholder="Min" className="w-24" value={formData.FICOMin} onChange={e => update('FICOMin', parseFloat(e.target.value) || 0)} />
                                        <span className="text-gray-400 text-sm">to</span>
                                        <Input type="number" placeholder="Max" className="w-24" value={formData.FICOMax} onChange={e => update('FICOMax', parseFloat(e.target.value) || 0)} />
                                      </div>
                                    </div>
                                  )
                                }
                                if (key === 'loanAmount') {
                                  return (
                                    <div key={key} className="space-y-1">
                                      <Label className="text-xs font-semibold text-gray-700">Loan Amount</Label>
                                      <div className="flex items-center gap-2">
                                        <Input type="number" placeholder="Min" className="w-32" value={formData.LoanAmountMin} onChange={e => update('LoanAmountMin', parseFloat(e.target.value) || 0)} />
                                        <span className="text-gray-400 text-sm">to</span>
                                        <Input type="number" placeholder="Max" className="w-32" value={formData.LoanAmountMax} onChange={e => update('LoanAmountMax', parseFloat(e.target.value) || 0)} />
                                      </div>
                                    </div>
                                  )
                                }
                                if (key === 'propertyTypes') {
                                  return <MultiSelect key={key} label="Property Types" options={PROPERTY_TYPES} selected={formData.PropertyTypes} onChange={v => update('PropertyTypes', v)} />
                                }
                                if (key === 'propertyUsage') {
                                  return <MultiSelect key={key} label="Property Usage" options={PROPERTY_USAGE} selected={formData.PropertyUsage} onChange={v => update('PropertyUsage', v)} />
                                }
                                if (key === 'loanTypes') {
                                  return <MultiSelect key={key} label="Loan Purposes" options={LOAN_TYPES} selected={formData.LoanTypes} onChange={v => update('LoanTypes', v)} />
                                }
                                if (key === 'quotingChannels') {
                                  return <MultiSelect key={key} label="Quoting Channels" options={QUOTING_CHANNELS} selected={formData.QuotingChannels} onChange={v => update('QuotingChannels', v)} />
                                }
                                if (key === 'lockPeriod') {
                                  return <MultiSelect key={key} label="Lock Periods" options={LOCK_PERIODS.map(p => `${p} Days`)} selected={formData.LockPeriods.map(p => `${p} Days`)} onChange={v => update('LockPeriods', v.map(s => parseInt(s)))} />
                                }
                                if (key === 'borrowerFilters') {
                                  return <MultiSelect key={key} label="Borrower Filters" options={BORROWER_FILTERS} selected={formData.BorrowerFilters} onChange={v => update('BorrowerFilters', v)} />
                                }
                                if (key === 'pointGroups') {
                                  return <MultiSelect key={key} label="Point Groups" options={POINT_GROUPS} selected={formData.PointGroups} onChange={v => update('PointGroups', v)} info={RULE_FIELD_TOOLTIPS.pointGroups} />
                                }
                                if (key === 'states') {
                                  const selectedCounties = formData.Counties ?? []
                                  const singleState = formData.States.length === 1 ? formData.States[0] : null
                                  const countyOptions = singleState ? getCountiesForState(singleState) : []
                                  return (
                                    <div key={key} className="w-full space-y-3">
                                      <MultiSelect
                                        label="States"
                                        options={STATES}
                                        selected={formData.States}
                                        onChange={v => {
                                          // Loantek clears counties whenever the state selection changes
                                          setFormData(prev => ({
                                            ...prev,
                                            States: v,
                                            Counties: [],
                                          }))
                                        }}
                                        info={RULE_FIELD_TOOLTIPS.selectedStates}
                                      />
                                      {singleState && (
                                        <MultiSelect
                                          label="Counties"
                                          options={countyOptions}
                                          selected={selectedCounties}
                                          onChange={v => update('Counties', v)}
                                        />
                                      )}
                                    </div>
                                  )
                                }
                                return null
                              })}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Programs */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="text-base font-bold text-gray-900">
                      Filter and verify the programs this rule will run against
                    </h3>
                    <button
                      type="button"
                      onClick={toggleAllPrograms}
                      className="text-sm text-[#0157FF] hover:underline font-medium shrink-0"
                    >
                      {allProgramsActive ? 'Deselect all' : 'Select all'}
                    </button>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {PROGRAM_FILTERS.map(({ key, label }) => (
                      <FilterPill
                        key={key}
                        label={label}
                        active={activePrograms.has(key)}
                        onClick={() => toggleProgram(key)}
                      />
                    ))}
                  </div>

                  {activePrograms.size > 0 && (
                    <div className="space-y-4 pt-2 border-t border-gray-100">
                      <div className="flex flex-wrap gap-4">
                        {activePrograms.has('lenders') && (
                          <MultiSelect label="Lenders" options={LENDERS} selected={formData.Lenders} onChange={v => update('Lenders', v)} />
                        )}
                        {activePrograms.has('productFamilies') && (
                          <MultiSelect label="Product Families" options={PRODUCT_FAMILIES} selected={formData.ProductFamilies} onChange={v => update('ProductFamilies', v)} />
                        )}
                        {activePrograms.has('productClasses') && (
                          <MultiSelect label="Product Classes" options={PRODUCT_CLASSES} selected={formData.ProductClasses} onChange={v => update('ProductClasses', v)} />
                        )}
                        {activePrograms.has('productTypes') && (
                          <MultiSelect label="Product Types" options={PRODUCT_TYPES} selected={formData.ProductTypes} onChange={v => update('ProductTypes', v)} />
                        )}
                        {activePrograms.has('productTerms') && (
                          <MultiSelect label="Product Terms" options={PRODUCT_TERMS} selected={formData.ProductTerms} onChange={v => update('ProductTerms', v)} />
                        )}
                      </div>
                      <p className="text-sm text-gray-500">Review which lender programs this rule will apply to.</p>
                      <div className="border border-gray-200 rounded-md overflow-hidden">
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="bg-gray-50 border-b border-gray-200">
                                <th className="px-4 py-3 text-left w-10">
                                  <Checkbox checked={allProgramsSelected} onCheckedChange={toggleAllProgramRows} />
                                </th>
                                <th className="px-4 py-3 text-left font-semibold text-gray-700">Lender Name</th>
                                <th className="px-4 py-3 text-left font-semibold text-gray-700">Program Name</th>
                                <th className="px-4 py-3 text-left font-semibold text-gray-700">Family</th>
                                <th className="px-4 py-3 text-left font-semibold text-gray-700">Class</th>
                                <th className="px-4 py-3 text-left font-semibold text-gray-700">Type</th>
                                <th className="px-4 py-3 text-left font-semibold text-gray-700">Term</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                              {programs.map(row => (
                                <tr key={row.id} className="hover:bg-gray-50">
                                  <td className="px-4 py-3"><Checkbox checked={formData.SelectedPrograms?.includes(row.id) ?? false} onCheckedChange={() => toggleProgramRow(row.id)} /></td>
                                  <td className="px-4 py-3 text-gray-800">{row.lender}</td>
                                  <td className="px-4 py-3 text-gray-800">{row.program}</td>
                                  <td className="px-4 py-3 text-gray-800">{row.family}</td>
                                  <td className="px-4 py-3 text-gray-800">{row.cls}</td>
                                  <td className="px-4 py-3 text-gray-800">{row.type}</td>
                                  <td className="px-4 py-3 text-gray-800">{row.term}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                        <div className="px-4 py-2 text-xs text-gray-400 border-t border-gray-100">Showing 5 of 1,593 programs</div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Schedule */}
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <AccordionSectionHeader
              checked={scheduleEnabled}
              onCheckedChange={setScheduleEnabled}
              title="Schedule when this rule applies"
              subtitle="Use only for time-sensitive pricing."
              tooltip={RULE_FIELD_TOOLTIPS.schedule}
            />

            {scheduleEnabled && (
              <div className="px-6 pb-6 space-y-4 border-t border-gray-100 pt-4">
                <p className="text-sm text-gray-500">Start and End dates/times are not required, and should only be used for special, time-sensitive pricing. Times are in ET.</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold text-gray-700">Start Date</Label>
                    <Input type="date" value={formData.StartDate || ''} onChange={e => update('StartDate', e.target.value || null)} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold text-gray-700">End Date</Label>
                    <Input type="date" value={formData.EndDate || ''} onChange={e => update('EndDate', e.target.value || null)} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold text-gray-700">Start Time (in ET)</Label>
                    <Input type="time" value={formData.StartTime || ''} onChange={e => update('StartTime', e.target.value || null)} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold text-gray-700">End Time (in ET)</Label>
                    <Input type="time" value={formData.EndTime || ''} onChange={e => update('EndTime', e.target.value || null)} />
                  </div>
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-gray-500">Week days on which the rule should be active.</p>
                  <div className="flex items-center gap-5 flex-wrap">
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'All days'].map(day => (
                      <label key={day} className="flex items-center gap-1.5 cursor-pointer text-sm text-gray-700">
                        <Checkbox /> {day}
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Disallow warning */}
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <label className="flex items-start gap-3 cursor-pointer">
            <Checkbox
              checked={formData.HideInQuoteAdjustments}
              onCheckedChange={c => update('HideInQuoteAdjustments', c === true)}
              className="mt-0.5 border-red-600 data-[state=checked]:bg-red-600 data-[state=checked]:border-red-600 data-[state=checked]:text-white"
            />
            <span className="text-sm text-red-800">
              Do NOT show this rule details in quote adjustments. If you select this option, only you will be able to see the adjustments in LoanPricer.
            </span>
          </label>
        </div>

        {/* Footer actions */}
        <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center sm:justify-end gap-3 pb-8">
          <Button variant="outline" onClick={() => router.push('/')} className="border-gray-300">
            Return to Rules
          </Button>
          <Button onClick={handleSave} className="bg-[#0157FF] hover:bg-blue-700 text-white font-semibold px-8">
            Stage Change
          </Button>
        </div>
      </div>
    </div>
  )
}

// ── Exported page component ───────────────────────────────────────────────────

export function NewRulePage() {
  return (
    <PricingRulesProvider>
      <Suspense fallback={<div className="min-h-screen bg-gray-50" />}>
        <NewRuleContent />
      </Suspense>
    </PricingRulesProvider>
  )
}
