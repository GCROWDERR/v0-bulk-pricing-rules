'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Check, ChevronDown, ChevronUp, Info, Search, Plus, Trash2 } from 'lucide-react'
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

interface ToggleListProps {
  label: string
  options: string[]
  selected: string[]
  onChange: (v: string[]) => void
  searchable?: boolean
  info?: boolean
}

function ToggleList({ label, options, selected, onChange, searchable = false, info = false }: ToggleListProps) {
  const [query, setQuery] = useState('')
  const toggle = (opt: string) =>
    selected.includes(opt) ? onChange(selected.filter(s => s !== opt)) : onChange([...selected, opt])

  const filtered = searchable && query.trim()
    ? options.filter(o => o.toLowerCase().includes(query.toLowerCase()))
    : options

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-1">
        <span className="text-sm font-bold text-gray-900">{label}</span>
        {info && <Info className="h-4 w-4 text-blue-500" />}
      </div>
      <div className="border border-input rounded-md bg-white overflow-hidden flex flex-col" style={{ minHeight: '180px', maxHeight: '240px' }}>
        {searchable && (
          <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-200">
            <Search className="h-4 w-4 text-gray-400 shrink-0" />
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search"
              className="flex-1 text-sm outline-none bg-transparent text-gray-700 placeholder:text-gray-400"
            />
          </div>
        )}
        <div className="flex-1 overflow-y-auto">
          {searchable && !query && (
            <button
              type="button"
              onClick={() => onChange(selected.length === options.length ? [] : [...options])}
              className="w-full flex items-center justify-between px-4 py-3 text-sm text-gray-800 hover:bg-gray-50 border-b border-gray-100"
            >
              <span>Select all</span>
              {selected.length === options.length && <Check className="h-4 w-4 text-[#0157FF]" />}
            </button>
          )}
          {filtered.map((opt, i) => {
            const isSelected = selected.includes(opt)
            return (
              <button
                key={opt}
                type="button"
                onClick={() => toggle(opt)}
                className={cn(
                  'w-full flex items-center justify-between px-4 py-3 text-sm text-left hover:bg-gray-50 transition-colors',
                  i < filtered.length - 1 && 'border-b border-gray-100'
                )}
              >
                <span className="text-gray-800">{opt}</span>
                {isSelected && <Check className="h-4 w-4 text-[#0157FF] shrink-0" />}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ── Inner content ─────────────────────────────────────────────────────────────

function NewRuleContent() {
  const router = useRouter()
  const { stageCreate } = usePricingRules()

  const [formData, setFormData] = useState<PricingRule>(() => createBlankRule(-Date.now()))
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [activeSections, setActiveSections] = useState<Set<'conditions' | 'programs' | 'schedule'>>(new Set())
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['conditions', 'programs', 'schedule']))

  const update = <K extends keyof PricingRule>(field: K, value: PricingRule[K]) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (errors[field as string]) {
      setErrors(prev => { const next = { ...prev }; delete next[field as string]; return next })
    }
  }

  const toggleSection = (key: 'conditions' | 'programs' | 'schedule') => {
    setActiveSections(prev => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })
  }

  const removeSection = (key: 'conditions' | 'programs' | 'schedule') => {
    setActiveSections(prev => { const next = new Set(prev); next.delete(key); return next })
  }

  const toggleExpanded = (key: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })
  }

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
  const toggleProgram = (id: number) => {
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

        {/* ── Optional criteria ─────────────────────────────────────────── */}
        <section className="space-y-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Optional criteria</h2>
            <p className="text-sm text-gray-500 mt-1">Add conditions to limit when this rule applies. If no criteria are added, this rule applies to all scenarios.</p>
          </div>

          {/* Pills */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm text-gray-500 mr-1">Add criteria:</span>
            {([
              { key: 'conditions' as const, label: 'Conditions' },
              { key: 'programs' as const, label: 'Programs' },
              { key: 'schedule' as const, label: 'Schedule' },
            ]).map(({ key, label }) => {
              const active = activeSections.has(key)
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => toggleSection(key)}
                  className={cn(
                    'inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full border text-sm font-medium transition-colors',
                    active
                      ? 'bg-[#0157FF] border-[#0157FF] text-white hover:bg-blue-700 hover:border-blue-700'
                      : 'bg-white border-gray-300 text-gray-700 hover:border-[#0157FF] hover:text-[#0157FF] hover:bg-blue-50'
                  )}
                  aria-pressed={active}
                >
                  {active ? <Check className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
                  {label}
                </button>
              )
            })}
          </div>

          {/* Conditions section */}
          {activeSections.has('conditions') && (
            <div className="border border-gray-200 rounded-lg overflow-hidden bg-white">
              <div className="flex items-center justify-between px-5 py-4">
                <h3 className="text-lg font-bold text-gray-900">Rule conditions</h3>
                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => removeSection('conditions')} className="p-1.5 text-red-600 hover:text-red-700 transition-colors rounded">
                    <Trash2 className="h-4 w-4" />
                  </button>
                  <button type="button" onClick={() => toggleExpanded('conditions')} className="p-1.5 text-gray-400 hover:text-gray-600 transition-colors rounded">
                    {expandedSections.has('conditions') ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                  </button>
                </div>
              </div>
              {expandedSections.has('conditions') && (
                <div className="px-5 pb-5 border-t border-gray-100 pt-4 space-y-5">
                  <p className="text-sm text-gray-500">Selecting from these criteria isn&apos;t necessary. If you leave them blank the rule will be applied to all scenarios.</p>
                  <div className="grid grid-cols-3 gap-6">
                    {[
                      { label: 'LTV', minField: 'LTVMin' as const, maxField: 'LTVMax' as const },
                      { label: 'FICO', minField: 'FICOMin' as const, maxField: 'FICOMax' as const },
                      { label: 'Loan Amount', minField: 'LoanAmountMin' as const, maxField: 'LoanAmountMax' as const },
                    ].map(({ label, minField, maxField }) => (
                      <div key={label} className="space-y-1">
                        <Label className="text-xs font-semibold text-gray-700">{label}</Label>
                        <div className="flex items-center gap-2">
                          <Input type="number" placeholder="Min" className="flex-1" value={formData[minField]} onChange={e => update(minField, parseFloat(e.target.value) || 0)} />
                          <span className="text-gray-400 text-sm">to</span>
                          <Input type="number" placeholder="Max" className="flex-1" value={formData[maxField]} onChange={e => update(maxField, parseFloat(e.target.value) || 0)} />
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="grid grid-cols-5 gap-4">
                    <ToggleList label="Property Types" options={PROPERTY_TYPES} selected={formData.PropertyTypes} onChange={v => update('PropertyTypes', v)} />
                    <ToggleList label="Property Usage" options={PROPERTY_USAGE} selected={formData.PropertyUsage} onChange={v => update('PropertyUsage', v)} />
                    <ToggleList label="Loan Types" options={LOAN_TYPES} selected={formData.LoanTypes} onChange={v => update('LoanTypes', v)} />
                    <ToggleList label="Quoting Channels" options={QUOTING_CHANNELS} selected={formData.QuotingChannels} onChange={v => update('QuotingChannels', v)} />
                    <ToggleList label="Lock Period" options={LOCK_PERIODS.map(p => `${p} Days`)} selected={formData.LockPeriods.map(p => `${p} Days`)} onChange={v => update('LockPeriods', v.map(s => parseInt(s)))} info />
                  </div>
                  <div className="grid grid-cols-4 gap-4">
                    <ToggleList label="Borrower Filters" options={BORROWER_FILTERS} selected={formData.BorrowerFilters} onChange={v => update('BorrowerFilters', v)} />
                    <ToggleList label="Point Groups" options={POINT_GROUPS} selected={formData.PointGroups} onChange={v => update('PointGroups', v)} />
                    <div className="col-span-2 grid grid-cols-2 gap-4">
                      <ToggleList label="States" options={STATES} selected={formData.States} onChange={v => update('States', v)} searchable />
                      <ToggleList label="Selected States" options={formData.States} selected={formData.States} onChange={v => update('States', v)} />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Programs section */}
          {activeSections.has('programs') && (
            <div className="border border-gray-200 rounded-lg overflow-hidden bg-white">
              <div className="flex items-center justify-between px-5 py-4">
                <h3 className="text-lg font-bold text-gray-900">Filter and verify the programs this rule will run against</h3>
                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => removeSection('programs')} className="p-1.5 text-red-600 hover:text-red-700 transition-colors rounded">
                    <Trash2 className="h-4 w-4" />
                  </button>
                  <button type="button" onClick={() => toggleExpanded('programs')} className="p-1.5 text-gray-400 hover:text-gray-600 transition-colors rounded">
                    {expandedSections.has('programs') ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                  </button>
                </div>
              </div>
              {expandedSections.has('programs') && (
                <div className="px-5 pb-5 border-t border-gray-100 pt-4 space-y-5">
                  <div className="grid grid-cols-5 gap-4">
                    <ToggleList label="Lenders" options={LENDERS} selected={formData.Lenders} onChange={v => update('Lenders', v)} />
                    <ToggleList label="Product Families" options={PRODUCT_FAMILIES} selected={formData.ProductFamilies} onChange={v => update('ProductFamilies', v)} />
                    <ToggleList label="Product Classes" options={PRODUCT_CLASSES} selected={formData.ProductClasses} onChange={v => update('ProductClasses', v)} />
                    <ToggleList label="Product Types" options={PRODUCT_TYPES} selected={formData.ProductTypes} onChange={v => update('ProductTypes', v)} />
                    <ToggleList label="Product Terms" options={PRODUCT_TERMS} selected={formData.ProductTerms} onChange={v => update('ProductTerms', v)} />
                  </div>
                  <p className="text-sm text-gray-500">Review which lender programs this rule will apply to. Select or deselect programs as needed.</p>
                  <div className="border border-input rounded-md overflow-hidden bg-white">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-gray-100 border-b border-input">
                            <th className="px-4 py-3 text-left w-10">
                              <Checkbox checked={allProgramsSelected} onCheckedChange={toggleAllPrograms} data-state={someProgramsSelected ? 'indeterminate' : undefined} />
                            </th>
                            <th className="px-4 py-3 text-left font-semibold text-gray-700">Lender Name</th>
                            <th className="px-4 py-3 text-left font-semibold text-gray-700">Lender Program Name</th>
                            <th className="px-4 py-3 text-left font-semibold text-gray-700">Product Family</th>
                            <th className="px-4 py-3 text-left font-semibold text-gray-700">Product Class</th>
                            <th className="px-4 py-3 text-left font-semibold text-gray-700">Product Type</th>
                            <th className="px-4 py-3 text-left font-semibold text-gray-700">Product Term</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-input">
                          {programs.map(row => (
                            <tr key={row.id} className="hover:bg-gray-50">
                              <td className="px-4 py-3"><Checkbox checked={formData.SelectedPrograms?.includes(row.id) ?? false} onCheckedChange={() => toggleProgram(row.id)} /></td>
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
                  </div>
                  <div className="text-xs text-gray-500 text-right">Showing 5 of 1,593 programs</div>
                </div>
              )}
            </div>
          )}

          {/* Schedule section */}
          {activeSections.has('schedule') && (
            <div className="border border-gray-200 rounded-lg overflow-hidden bg-white">
              <div className="flex items-center justify-between px-5 py-4">
                <h3 className="text-lg font-bold text-gray-900">Schedule when this rule applies</h3>
                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => removeSection('schedule')} className="p-1.5 text-red-600 hover:text-red-700 transition-colors rounded">
                    <Trash2 className="h-4 w-4" />
                  </button>
                  <button type="button" onClick={() => toggleExpanded('schedule')} className="p-1.5 text-gray-400 hover:text-gray-600 transition-colors rounded">
                    {expandedSections.has('schedule') ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                  </button>
                </div>
              </div>
              {expandedSections.has('schedule') && (
                <div className="px-5 pb-5 border-t border-gray-100 pt-4 space-y-4">
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
                    <div className="flex items-center gap-5">
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
          )}
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
