'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
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
import { Info, Plus, X, Check, ChevronsUpDown } from 'lucide-react'
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
  info?: boolean
}

function MultiSelect({ label, options, selected, onChange, info = false }: MultiSelectProps) {
  const [open, setOpen] = useState(false)
  const allSelected = selected.length === options.length
  const toggle = (opt: string) =>
    selected.includes(opt) ? onChange(selected.filter(s => s !== opt)) : onChange([...selected, opt])
  const toggleAll = () => onChange(allSelected ? [] : [...options])

  return (
    <div className="flex flex-col gap-1.5 min-w-[200px]">
      <div className="flex items-center gap-1">
        <span className="text-sm font-semibold text-gray-700">{label}</span>
        {info && <Info className="h-3.5 w-3.5 text-blue-500" />}
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
              <CommandEmpty>No results found.</CommandEmpty>
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

function OptionalBadge() {
  return <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-500 uppercase tracking-wide">Optional</span>
}

function FilterPill({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-sm font-medium transition-colors',
        active
          ? 'bg-gray-900 border-gray-900 text-white hover:bg-gray-800'
          : 'bg-white border-gray-300 text-gray-700 hover:border-gray-400'
      )}
    >
      {active ? <X className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
      {label}
    </button>
  )
}

function NewRuleContent() {
  const router = useRouter()
  const { stageCreate } = usePricingRules()

  const [formData, setFormData] = useState<PricingRule>(() => createBlankRule(-Date.now()))
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [activeFilters, setActiveFilters] = useState<Set<FilterKey>>(new Set())
  const [activePrograms, setActivePrograms] = useState<Set<ProgramKey>>(new Set())

  const update = <K extends keyof PricingRule>(field: K, value: PricingRule[K]) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (errors[field as string]) {
      setErrors(prev => { const next = { ...prev }; delete next[field as string]; return next })
    }
  }

  const toggleFilter = (key: FilterKey) => setActiveFilters(prev => {
    const next = new Set(prev); next.has(key) ? next.delete(key) : next.add(key); return next
  })

  const toggleProgram = (key: ProgramKey) => setActivePrograms(prev => {
    const next = new Set(prev); next.has(key) ? next.delete(key) : next.add(key); return next
  })

  const validate = (): Record<string, string> => {
    const errs: Record<string, string> = {}
    if (!formData.RuleDescription?.trim()) errs.RuleDescription = 'A rule description is required.'
    if (formData.LockPeriod === null || formData.LockPeriod === undefined || formData.LockPeriod === 0) errs.LockPeriod = 'Please select a lock period.'
    if (!formData.FeeSet || formData.FeeSet.trim() === '') errs.FeeSet = 'Please select a fee set.'
    return errs
  }

  const handleSave = () => {
    const errs = validate()
    if (Object.keys(errs).length > 0) { setErrors(errs); return }
    stageCreate(formData)
    router.push('/')
  }

  const programs = [
    { id: 0, lender: 'Achieve', program: 'Home Equity Loan - Fixed 20 Year', family: 'HOMEEQUITY', cls: 'EQUITY', type: 'FIXED', term: '20' },
    { id: 1, lender: 'Ally2 - Conforming', program: 'FNMA 15 Year Fixed - High Balance', family: 'CONVENTIONAL', cls: 'HIGH BALANCE', type: 'FIXED', term: '15' },
    { id: 2, lender: 'Ally2 - Conforming', program: 'FNMA 20 Year Fixed - High Balance', family: 'CONVENTIONAL', cls: 'HIGH BALANCE', type: 'FIXED', term: '20' },
    { id: 3, lender: 'Ally2 - Conforming', program: 'FNMA 30 Year Fixed - High Balance', family: 'CONVENTIONAL', cls: 'HIGH BALANCE', type: 'FIXED', term: '30' },
    { id: 4, lender: 'Ally2 - Conforming', program: 'FNMA 10/6 ARM', family: 'CONVENTIONAL', cls: 'STANDARD', type: 'ARM', term: '10/6' },
  ]
  const allProgramsSelected = formData.SelectedPrograms?.length === programs.length
  const someProgramsSelected = (formData.SelectedPrograms?.length ?? 0) > 0 && !allProgramsSelected
  const toggleAllPrograms = () => update('SelectedPrograms', allProgramsSelected ? [] : programs.map(p => p.id))
  const toggleProgramRow = (id: number) => {
    const current: number[] = formData.SelectedPrograms ?? []
    update('SelectedPrograms', current.includes(id) ? current.filter(i => i !== id) : [...current, id])
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top nav */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center gap-4">
          <img src="/loantek-logo.webp" alt="LoanTek" className="h-8" />
          <div className="h-8 w-px bg-gray-300" />
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Pricing Rules: New</h1>
            <p className="text-sm text-gray-600">Configure rule details, criteria, and schedule.</p>
          </div>
        </div>
      </div>

      {/* Page content */}
      <div className="max-w-4xl mx-auto px-6 py-8 space-y-8">

        {/* ── Apply these rules ─────────────────────────────────────────── */}
        <section className="bg-white border border-gray-200 rounded-lg p-8 space-y-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Apply these rules</h2>
            <p className="text-sm text-gray-500 mt-1">This is a required step. Define what this rule will do.</p>
          </div>

          {/* Description + Disallow */}
          <div className="space-y-2">
            <div className="flex items-center gap-1">
              <Label className="text-xs font-semibold text-gray-700">
                Enter a brief description to identify the rule in your pricing adjustments
                <span className="text-red-600 ml-1">*</span>
              </Label>
              <Info className="h-3.5 w-3.5 text-blue-500" />
            </div>
            <div className="flex items-center gap-3">
              <div className="flex-1 space-y-1">
                <Input
                  value={formData.RuleDescription}
                  onChange={e => update('RuleDescription', e.target.value)}
                  placeholder="Describe this rule"
                  className={cn('w-full', errors.RuleDescription && 'border-red-500 focus-visible:ring-red-500')}
                  aria-invalid={!!errors.RuleDescription}
                />
                {errors.RuleDescription && <p className="text-xs text-red-600">{errors.RuleDescription}</p>}
              </div>
              <label className="flex items-center gap-1.5 shrink-0 self-start mt-1 cursor-pointer text-sm text-gray-700">
                <Checkbox checked={formData.Disallow} onCheckedChange={c => update('Disallow', c === true)} />
                Disallow
              </label>
            </div>
          </div>

          {/* Lock Period / Fee Set / MI Company */}
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-1">
                <Label className="text-xs font-semibold text-gray-700">Lock period<span className="text-red-600 ml-1">*</span></Label>
                <Info className="h-3.5 w-3.5 text-blue-500" />
              </div>
              <Select value={formData.LockPeriod?.toString() || ''} onValueChange={v => update('LockPeriod', parseInt(v))}>
                <SelectTrigger className={cn('w-full', errors.LockPeriod && 'border-red-500')} aria-invalid={!!errors.LockPeriod}>
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>{LOCK_PERIODS.map(p => <SelectItem key={p} value={p.toString()}>{p} Days</SelectItem>)}</SelectContent>
              </Select>
              {errors.LockPeriod && <p className="text-xs text-red-600">{errors.LockPeriod}</p>}
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-1">
                <Label className="text-xs font-semibold text-gray-700">Fee Set<span className="text-red-600 ml-1">*</span></Label>
                <Info className="h-3.5 w-3.5 text-blue-500" />
              </div>
              <Select value={formData.FeeSet} onValueChange={v => update('FeeSet', v)}>
                <SelectTrigger className={cn('w-full', errors.FeeSet && 'border-red-500')} aria-invalid={!!errors.FeeSet}>
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>{FEE_SETS.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent>
              </Select>
              {errors.FeeSet && <p className="text-xs text-red-600">{errors.FeeSet}</p>}
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
          <div className="grid grid-cols-3 gap-4">
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

          {/* Comp Flat Fee / Final Price Min / Max */}
          <div className="grid grid-cols-3 gap-4">
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
                <Info className="h-3.5 w-3.5 text-blue-500" />
              </div>
              <Input type="number" step="0.001" value={formData.FinalPriceMax} onChange={e => update('FinalPriceMax', parseFloat(e.target.value) || 0)} />
            </div>
          </div>

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
                <Info className="h-4 w-4 text-blue-500" />
              </div>
            </div>
            <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-700 mb-0.5">
              <Checkbox checked={formData.FinanceUFMIP} onCheckedChange={c => update('FinanceUFMIP', c === true)} /> Finance UFMIP on FHA/VA?
            </label>
          </div>
        </section>

        {/* ── Filter criteria ───────────────────────────────────────────── */}
        <section className="space-y-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Filter criteria</h2>
            <div className="flex items-center gap-2 mt-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded-md text-sm text-blue-700 w-fit">
              <Info className="h-4 w-4 shrink-0" />
              Select any criteria to refine this rule. Leave fields blank to apply this rule to all scenarios.
            </div>
          </div>

          {/* ── Rule filters card ─────────────────────────────── */}
          <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-4">
            <div className="flex items-center gap-0">
              <h3 className="text-base font-bold text-gray-900">Rule filters</h3>
              <OptionalBadge />
            </div>
            <p className="text-sm text-gray-500">Selecting from these criteria isn&apos;t necessary. If you leave them blank the rule will be applied to all scenarios.</p>

            {/* Filter pills */}
            <div className="flex flex-wrap gap-2">
              {([
                { key: 'ltv' as FilterKey, label: 'LTV' },
                { key: 'fico' as FilterKey, label: 'FICO' },
                { key: 'loanAmount' as FilterKey, label: 'Loan amount' },
                { key: 'propertyTypes' as FilterKey, label: 'Property Types' },
                { key: 'propertyUsage' as FilterKey, label: 'Property Usage' },
                { key: 'loanTypes' as FilterKey, label: 'Loan Types' },
                { key: 'quotingChannels' as FilterKey, label: 'Quoting Channels' },
                { key: 'lockPeriod' as FilterKey, label: 'Lock Period' },
                { key: 'borrowerFilters' as FilterKey, label: 'Borrower Filters' },
                { key: 'pointGroups' as FilterKey, label: 'Point Groups' },
                { key: 'states' as FilterKey, label: 'States' },
              ]).map(({ key, label }) => (
                <FilterPill key={key} label={label} active={activeFilters.has(key)} onClick={() => toggleFilter(key)} />
              ))}
            </div>

            {/* Active filter inputs */}
            {activeFilters.size > 0 && (
              <div className="space-y-4 pt-2 border-t border-gray-100">
                {/* Range inputs */}
                {(activeFilters.has('ltv') || activeFilters.has('fico') || activeFilters.has('loanAmount')) && (
                  <div className="flex flex-wrap gap-6">
                    {activeFilters.has('ltv') && (
                      <div className="space-y-1">
                        <Label className="text-xs font-semibold text-gray-700">LTV</Label>
                        <div className="flex items-center gap-2">
                          <Input type="number" placeholder="Min" className="w-24" value={formData.LTVMin} onChange={e => update('LTVMin', parseFloat(e.target.value) || 0)} />
                          <span className="text-gray-400 text-sm">to</span>
                          <Input type="number" placeholder="Max" className="w-24" value={formData.LTVMax} onChange={e => update('LTVMax', parseFloat(e.target.value) || 0)} />
                        </div>
                      </div>
                    )}
                    {activeFilters.has('fico') && (
                      <div className="space-y-1">
                        <Label className="text-xs font-semibold text-gray-700">FICO</Label>
                        <div className="flex items-center gap-2">
                          <Input type="number" placeholder="Min" className="w-24" value={formData.FICOMin} onChange={e => update('FICOMin', parseFloat(e.target.value) || 0)} />
                          <span className="text-gray-400 text-sm">to</span>
                          <Input type="number" placeholder="Max" className="w-24" value={formData.FICOMax} onChange={e => update('FICOMax', parseFloat(e.target.value) || 0)} />
                        </div>
                      </div>
                    )}
                    {activeFilters.has('loanAmount') && (
                      <div className="space-y-1">
                        <Label className="text-xs font-semibold text-gray-700">Loan amount</Label>
                        <div className="flex items-center gap-2">
                          <Input type="number" placeholder="Min" className="w-32" value={formData.LoanAmountMin} onChange={e => update('LoanAmountMin', parseFloat(e.target.value) || 0)} />
                          <span className="text-gray-400 text-sm">to</span>
                          <Input type="number" placeholder="Max" className="w-32" value={formData.LoanAmountMax} onChange={e => update('LoanAmountMax', parseFloat(e.target.value) || 0)} />
                        </div>
                      </div>
                    )}
                  </div>
                )}
                {/* List selectors */}
                {(activeFilters.has('propertyTypes') || activeFilters.has('propertyUsage') || activeFilters.has('loanTypes') || activeFilters.has('quotingChannels') || activeFilters.has('lockPeriod')) && (
                  <div className="flex flex-wrap gap-4">
                    {activeFilters.has('propertyTypes') && (
                      <MultiSelect label="Property Types" options={PROPERTY_TYPES} selected={formData.PropertyTypes} onChange={v => update('PropertyTypes', v)} />
                    )}
                    {activeFilters.has('propertyUsage') && (
                      <MultiSelect label="Property Usage" options={PROPERTY_USAGE} selected={formData.PropertyUsage} onChange={v => update('PropertyUsage', v)} />
                    )}
                    {activeFilters.has('loanTypes') && (
                      <MultiSelect label="Loan Types" options={LOAN_TYPES} selected={formData.LoanTypes} onChange={v => update('LoanTypes', v)} />
                    )}
                    {activeFilters.has('quotingChannels') && (
                      <MultiSelect label="Quoting Channels" options={QUOTING_CHANNELS} selected={formData.QuotingChannels} onChange={v => update('QuotingChannels', v)} />
                    )}
                    {activeFilters.has('lockPeriod') && (
                      <MultiSelect label="Lock Period" options={LOCK_PERIODS.map(p => `${p} Days`)} selected={formData.LockPeriods.map(p => `${p} Days`)} onChange={v => update('LockPeriods', v.map(s => parseInt(s)))} info />
                    )}
                  </div>
                )}
                {(activeFilters.has('borrowerFilters') || activeFilters.has('pointGroups') || activeFilters.has('states')) && (
                  <div className="flex flex-wrap gap-4">
                    {activeFilters.has('borrowerFilters') && (
                      <MultiSelect label="Borrower Filters" options={BORROWER_FILTERS} selected={formData.BorrowerFilters} onChange={v => update('BorrowerFilters', v)} />
                    )}
                    {activeFilters.has('pointGroups') && (
                      <MultiSelect label="Point Groups" options={POINT_GROUPS} selected={formData.PointGroups} onChange={v => update('PointGroups', v)} />
                    )}
                    {activeFilters.has('states') && (
                      <MultiSelect label="States" options={STATES} selected={formData.States} onChange={v => update('States', v)} />
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── Programs card ─────────────────────────────────── */}
          <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-4">
            <div className="flex items-center">
              <h3 className="text-base font-bold text-gray-900">Filter and verify the programs this rule will run against</h3>
              <OptionalBadge />
            </div>

            {/* Program pills */}
            <div className="flex flex-wrap gap-2">
              {([
                { key: 'lenders' as ProgramKey, label: 'Lenders' },
                { key: 'productFamilies' as ProgramKey, label: 'Product Families' },
                { key: 'productClasses' as ProgramKey, label: 'Product Classes' },
                { key: 'productTypes' as ProgramKey, label: 'Product Types' },
                { key: 'productTerms' as ProgramKey, label: 'Product Terms' },
              ]).map(({ key, label }) => (
                <FilterPill key={key} label={label} active={activePrograms.has(key)} onClick={() => toggleProgram(key)} />
              ))}
            </div>

            {/* Active program inputs */}
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
                            <Checkbox checked={allProgramsSelected} onCheckedChange={toggleAllPrograms} />
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

          {/* ── Schedule card ─────────────────────────────────── */}
          <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-4">
            <div className="flex items-center">
              <h3 className="text-base font-bold text-gray-900">Schedule when this rule applies</h3>
              <OptionalBadge />
            </div>
            <p className="text-sm text-gray-500">Start and End dates/times are not required, and should only be used for special, time-sensitive pricing. Times are in ET.</p>
            <div className="grid grid-cols-2 gap-4">
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
        </section>

        {/* Disallow warning */}
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <label className="flex items-start gap-3 cursor-pointer">
            <Checkbox checked={formData.HideInQuoteAdjustments} onCheckedChange={c => update('HideInQuoteAdjustments', c === true)} className="mt-0.5" />
            <span className="text-sm text-red-800">
              Do NOT show this rule details in quote adjustments. If you select this option, only you will be able to see the adjustments in LoanPricer.
            </span>
          </label>
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-end gap-3 pb-8">
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
      <NewRuleContent />
    </PricingRulesProvider>
  )
}
