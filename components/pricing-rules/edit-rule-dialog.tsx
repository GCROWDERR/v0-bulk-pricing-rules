'use client'

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { ChevronDown, Info } from 'lucide-react'
import { usePricingRules } from '@/lib/pricing-rules-context'
import type { PricingRule } from '@/lib/pricing-rules-data'
import {
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

interface EditRuleDialogProps {
  rule: PricingRule | null
  open: boolean
  onOpenChange: (open: boolean) => void
  isNew?: boolean
}

// ── Small helper components ───────────────────────────────────────────────────

function StepLabel({ n, label }: { n: number; label: string }) {
  return (
    <div className="mb-1">
      <p className="text-[11px] font-semibold tracking-widest text-gray-500 uppercase">Step {n}</p>
      <h2 className="text-2xl font-bold text-gray-900">{label}</h2>
    </div>
  )
}

interface CollapsibleStepProps {
  n: number
  label: string
  defaultOpen?: boolean
  children: React.ReactNode
}

function CollapsibleStep({ n, label, defaultOpen = false, children }: CollapsibleStepProps) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger className="flex items-center gap-2 w-full text-left group">
        <p className="text-[11px] font-semibold tracking-widest text-gray-500 uppercase">Step {n}</p>
        <h2 className="text-2xl font-bold text-gray-900 flex-1">{label}</h2>
        <ChevronDown className={cn('h-5 w-5 text-gray-500 transition-transform', open && 'rotate-180')} />
      </CollapsibleTrigger>
      <CollapsibleContent className="pt-4">
        {children}
      </CollapsibleContent>
    </Collapsible>
  )
}

interface ToggleListProps {
  label: string
  options: string[]
  selected: string[]
  onChange: (v: string[]) => void
  columns?: number
}

function ToggleList({ label, options, selected, onChange, columns = 1 }: ToggleListProps) {
  const toggle = (opt: string) =>
    selected.includes(opt) ? onChange(selected.filter(s => s !== opt)) : onChange([...selected, opt])
  const allSelected = selected.length === options.length

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-semibold text-gray-700 uppercase tracking-wide">{label}</span>
        <button
          type="button"
          onClick={() => onChange(allSelected ? [] : [...options])}
          className="text-xs text-blue-600 hover:underline"
        >
          {allSelected ? 'Deselect All' : 'Toggle All'}
        </button>
      </div>
      <div className="border rounded p-2 bg-white space-y-0.5 max-h-44 overflow-y-auto">
        {options.map(opt => (
          <label
            key={opt}
            className={cn(
              'flex items-center gap-2 px-2 py-1 rounded cursor-pointer text-sm hover:bg-gray-50',
              selected.includes(opt) && 'bg-blue-50'
            )}
          >
            <Checkbox
              checked={selected.includes(opt)}
              onCheckedChange={() => toggle(opt)}
              className="shrink-0"
            />
            <span className={selected.includes(opt) ? 'text-blue-800 font-medium' : 'text-gray-700'}>{opt}</span>
          </label>
        ))}
      </div>
      {selected.length > 0 && (
        <p className="text-xs text-gray-400">{selected.length} of {options.length} selected</p>
      )}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export function EditRuleDialog({ rule, open, onOpenChange, isNew = false }: EditRuleDialogProps) {
  const { stageUpdate, stageCreate, setEditingRule, getDraftForRule, getRuleWithDraft } = usePricingRules()

  const currentRule = rule ? getRuleWithDraft(rule.RuleId) : null
  const existingDraft = rule ? getDraftForRule(rule.RuleId) : null
  const originalRule = existingDraft?.originalRule || rule

  const [formData, setFormData] = useState<PricingRule | null>(null)

  useEffect(() => {
    if (currentRule) setFormData({ ...currentRule })
  }, [currentRule])

  if (!formData) return null

  const update = <K extends keyof PricingRule>(field: K, value: PricingRule[K]) =>
    setFormData(prev => prev ? { ...prev, [field]: value } : null)

  const handleSave = () => {
    if (!formData || !originalRule) return
    isNew ? stageCreate(formData) : stageUpdate(originalRule, formData)
    setEditingRule(null)
    onOpenChange(false)
  }

  const handleClose = () => {
    setEditingRule(null)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="!max-w-[1000px] !w-[1000px] max-h-[92vh] p-0 gap-0 flex flex-col overflow-hidden"
        showCloseButton={false}
      >
        {/* Header */}
        <DialogHeader className="px-8 pt-6 pb-4 border-b shrink-0">
          <DialogTitle className="text-xl font-bold text-gray-900">
            {isNew ? 'Pricing Rules: New' : `Pricing Rules: Edit #${formData.RuleId}`}
          </DialogTitle>
          <DialogDescription className="text-sm text-gray-500">
            Configure rule details, criteria, and schedule.
          </DialogDescription>
        </DialogHeader>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto">
          <div className="px-8 py-6 space-y-8">

            {/* ── STEP 1 ──────────────────────────────────────────────── */}
            <section>
              <StepLabel n={1} label="Apply these rules" />
              <div className="mt-4 space-y-4">

                {/* Description + Disallow */}
                <div>
                  <Label className="text-xs font-semibold text-gray-700 mb-1 block">
                    Enter a brief description to identify the rule in your pricing adjustments
                  </Label>
                  <div className="flex items-center gap-3">
                    <Input
                      value={formData.RuleDescription}
                      onChange={e => update('RuleDescription', e.target.value)}
                      placeholder="Describe this rule"
                      className="flex-1"
                    />
                    <label className="flex items-center gap-1.5 shrink-0 cursor-pointer text-sm text-gray-700">
                      <Checkbox
                        checked={formData.Disallow}
                        onCheckedChange={c => update('Disallow', c === true)}
                      />
                      Disallow
                    </label>
                    <Info className="h-4 w-4 text-blue-500 shrink-0" />
                  </div>
                </div>

                {/* Lock Period / Fee Set / MI Company */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold text-gray-700">Lock period</Label>
                    <Select
                      value={formData.LockPeriod?.toString() || ''}
                      onValueChange={v => update('LockPeriod', parseInt(v))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent>
                        {LOCK_PERIODS.map(p => (
                          <SelectItem key={p} value={p.toString()}>{p} Days</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-1">
                      <Label className="text-xs font-semibold text-gray-700">Fee Set</Label>
                      <Info className="h-3.5 w-3.5 text-blue-500" />
                    </div>
                    <Select value={formData.FeeSet} onValueChange={v => update('FeeSet', v)}>
                      <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>
                        {FEE_SETS.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold text-gray-700">MI Company</Label>
                    <Select
                      value={formData.MICompany || 'none'}
                      onValueChange={v => update('MICompany', v === 'none' ? '' : v)}
                    >
                      <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
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
                    <Input
                      type="number" step="0.001"
                      value={formData.Price}
                      onChange={e => update('Price', parseFloat(e.target.value) || 0)}
                      placeholder="Price"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold text-gray-700">Rate</Label>
                    <Input
                      value={formData.Rate}
                      onChange={e => update('Rate', e.target.value)}
                      placeholder="Rate"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold text-gray-700">Fees</Label>
                    <Input
                      type="number" step="0.01"
                      value={formData.Fee}
                      onChange={e => update('Fee', parseFloat(e.target.value) || 0)}
                      placeholder="Fees"
                    />
                  </div>
                </div>

                {/* Margin Type */}
                <RadioGroup
                  value={formData.MarginType}
                  onValueChange={v => update('MarginType', v as 'percentage' | 'flat')}
                  className="flex gap-6"
                >
                  <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-700">
                    <RadioGroupItem value="percentage" />
                    Percentage margin
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-700">
                    <RadioGroupItem value="flat" />
                    Flat fee margin
                  </label>
                </RadioGroup>

                {/* Final Price Min / Max */}
                <div className="flex items-end gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold text-gray-700">Final Price MIN</Label>
                    <Input
                      type="number" step="0.001" className="w-28"
                      value={formData.FinalPriceMin}
                      onChange={e => update('FinalPriceMin', parseFloat(e.target.value) || 0)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold text-gray-700">Final Price MAX</Label>
                    <Input
                      type="number" step="0.001" className="w-28"
                      value={formData.FinalPriceMax}
                      onChange={e => update('FinalPriceMax', parseFloat(e.target.value) || 0)}
                    />
                  </div>
                  <Info className="h-4 w-4 text-blue-500 mb-2.5" />
                </div>

                {/* Checkboxes row 1 */}
                <div className="flex flex-wrap gap-x-8 gap-y-3">
                  <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-700">
                    <Checkbox
                      checked={formData.HasSecondMortgage}
                      onCheckedChange={c => update('HasSecondMortgage', c === true)}
                    />
                    Has second mortgage?
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-700">
                    <Checkbox
                      checked={formData.IgnoreNonEighthRates}
                      onCheckedChange={c => update('IgnoreNonEighthRates', c === true)}
                    />
                    Ignore Non Eighth Rates (e.g. 3.490)?
                  </label>
                </div>

                {/* Checkboxes row 2 */}
                <div className="flex flex-wrap gap-x-8 gap-y-3">
                  <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-700">
                    <Checkbox
                      checked={formData.IncludeUFMIP}
                      onCheckedChange={c => update('IncludeUFMIP', c === true)}
                    />
                    Include UFMIP on FHA/VA in cash to borrower?
                  </label>
                </div>

                {/* Max Cash Back + Finance UFMIP */}
                <div className="flex items-end gap-4">
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold text-gray-700">Max Cash Back to Borrower</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number" step="0.01" className="w-36"
                        value={formData.MaxCashBack}
                        onChange={e => update('MaxCashBack', parseFloat(e.target.value) || 0)}
                        placeholder="Max cash back"
                      />
                      <Info className="h-4 w-4 text-blue-500" />
                    </div>
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-700 mb-0.5">
                    <Checkbox
                      checked={formData.FinanceUFMIP}
                      onCheckedChange={c => update('FinanceUFMIP', c === true)}
                    />
                    Finance UFMIP on FHA/VA?
                  </label>
                </div>
              </div>
            </section>

            <hr className="border-gray-200" />

            {/* ── STEP 2 ──────────────────────────────────────────────── */}
            <CollapsibleStep n={2} label="Select from these optional criteria">
              <div className="space-y-5">
                <p className="text-sm text-gray-500">
                  Selecting from these criteria isn&apos;t necessary. If you leave them blank the rule will be applied to all scenarios.
                </p>

                {/* Numeric ranges */}
                <div className="grid grid-cols-3 gap-6">
                  {[
                    { label: 'LTV', minField: 'LTVMin' as const, maxField: 'LTVMax' as const },
                    { label: 'FICO', minField: 'FICOMin' as const, maxField: 'FICOMax' as const },
                    { label: 'Loan Amount', minField: 'LoanAmountMin' as const, maxField: 'LoanAmountMax' as const },
                  ].map(({ label, minField, maxField }) => (
                    <div key={label} className="space-y-1">
                      <Label className="text-xs font-semibold text-gray-700">{label}</Label>
                      <div className="flex items-center gap-2">
                        <Input
                          type="number" placeholder="Min" className="flex-1"
                          value={formData[minField]}
                          onChange={e => update(minField, parseFloat(e.target.value) || 0)}
                        />
                        <span className="text-gray-400 text-sm">to</span>
                        <Input
                          type="number" placeholder="Max" className="flex-1"
                          value={formData[maxField]}
                          onChange={e => update(maxField, parseFloat(e.target.value) || 0)}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Multi-select toggles */}
                <div className="grid grid-cols-5 gap-4">
                  <ToggleList
                    label="Property Types"
                    options={PROPERTY_TYPES}
                    selected={formData.PropertyTypes}
                    onChange={v => update('PropertyTypes', v)}
                  />
                  <ToggleList
                    label="Property Usage"
                    options={PROPERTY_USAGE}
                    selected={formData.PropertyUsage}
                    onChange={v => update('PropertyUsage', v)}
                  />
                  <ToggleList
                    label="Loan Types"
                    options={LOAN_TYPES}
                    selected={formData.LoanTypes}
                    onChange={v => update('LoanTypes', v)}
                  />
                  <ToggleList
                    label="Quoting Channels"
                    options={QUOTING_CHANNELS}
                    selected={formData.QuotingChannels}
                    onChange={v => update('QuotingChannels', v)}
                  />
                  <ToggleList
                    label="Lock Periods"
                    options={LOCK_PERIODS.map(p => `${p} Days`)}
                    selected={formData.LockPeriods.map(p => `${p} Days`)}
                    onChange={v => update('LockPeriods', v.map(s => parseInt(s)))}
                  />
                </div>

                <div className="grid grid-cols-4 gap-4">
                  <ToggleList
                    label="Borrower Filters"
                    options={BORROWER_FILTERS}
                    selected={formData.BorrowerFilters}
                    onChange={v => update('BorrowerFilters', v)}
                  />
                  <ToggleList
                    label="Point Groups"
                    options={POINT_GROUPS}
                    selected={formData.PointGroups}
                    onChange={v => update('PointGroups', v)}
                  />
                  <div className="col-span-2">
                    <ToggleList
                      label="States"
                      options={STATES}
                      selected={formData.States}
                      onChange={v => update('States', v)}
                      columns={4}
                    />
                  </div>
                </div>
              </div>
            </CollapsibleStep>

            <hr className="border-gray-200" />

            {/* ── STEP 3 ──────────────────────────────────────────────── */}
            <CollapsibleStep n={3} label="Filter the programs the rule runs against">
              <div className="grid grid-cols-5 gap-4">
                <ToggleList
                  label="Lenders"
                  options={LENDERS}
                  selected={formData.Lenders}
                  onChange={v => update('Lenders', v)}
                />
                <ToggleList
                  label="Product Families"
                  options={PRODUCT_FAMILIES}
                  selected={formData.ProductFamilies}
                  onChange={v => update('ProductFamilies', v)}
                />
                <ToggleList
                  label="Product Classes"
                  options={PRODUCT_CLASSES}
                  selected={formData.ProductClasses}
                  onChange={v => update('ProductClasses', v)}
                />
                <ToggleList
                  label="Product Types"
                  options={PRODUCT_TYPES}
                  selected={formData.ProductTypes}
                  onChange={v => update('ProductTypes', v)}
                />
                <ToggleList
                  label="Product Terms"
                  options={PRODUCT_TERMS}
                  selected={formData.ProductTerms}
                  onChange={v => update('ProductTerms', v)}
                />
              </div>
            </CollapsibleStep>

            <hr className="border-gray-200" />

            {/* ── STEP 4 ──────────────────────────────────────────────── */}
            <CollapsibleStep n={4} label="Schedule when this rule applies">
              <div className="space-y-4">
                <p className="text-sm text-gray-500">
                  Start and End dates/times are not required, and should only be used for special, time-sensitive pricing. Times are in ET.
                </p>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold text-gray-700">Start Date</Label>
                    <Input
                      type="date"
                      value={formData.StartDate || ''}
                      onChange={e => update('StartDate', e.target.value || null)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold text-gray-700">End Date</Label>
                    <Input
                      type="date"
                      value={formData.EndDate || ''}
                      onChange={e => update('EndDate', e.target.value || null)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold text-gray-700">Start Time (in ET)</Label>
                    <Input
                      type="time"
                      value={formData.StartTime || ''}
                      onChange={e => update('StartTime', e.target.value || null)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold text-gray-700">End Time (in ET)</Label>
                    <Input
                      type="time"
                      value={formData.EndTime || ''}
                      onChange={e => update('EndTime', e.target.value || null)}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-gray-500">Week days on which the rule should be active.</p>
                  <div className="flex items-center gap-5">
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'All days'].map(day => (
                      <label key={day} className="flex items-center gap-1.5 cursor-pointer text-sm text-gray-700">
                        <Checkbox />
                        {day}
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </CollapsibleStep>

            <hr className="border-gray-200" />

            {/* Visibility */}
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <label className="flex items-start gap-3 cursor-pointer">
                <Checkbox
                  checked={formData.HideInQuoteAdjustments}
                  onCheckedChange={c => update('HideInQuoteAdjustments', c === true)}
                  className="mt-0.5"
                />
                <span className="text-sm text-red-800">
                  Do NOT show this rule details in quote adjustments. If you select this option, only you will be able to see the adjustments in LoanPricer.
                </span>
              </label>
            </div>

            {/* Save */}
            <div className="flex items-center justify-between pb-2">
              <Button variant="outline" onClick={handleClose} className="border-gray-300">
                Return to Rules
              </Button>
              <Button
                onClick={handleSave}
                className="bg-[#0157FF] hover:bg-blue-700 text-white font-semibold px-8"
              >
                Stage Change
              </Button>
            </div>

          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
