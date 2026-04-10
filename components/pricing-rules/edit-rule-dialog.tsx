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
import { ChevronDown, ChevronRight, AlertTriangle } from 'lucide-react'
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

interface CollapsibleSectionProps {
  title: string
  step: number
  defaultOpen?: boolean
  children: React.ReactNode
}

function CollapsibleSection({ title, step, defaultOpen = true, children }: CollapsibleSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen)

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="border rounded-lg">
      <CollapsibleTrigger className="flex items-center justify-between w-full p-4 hover:bg-gray-50 transition-colors">
        <div className="flex items-center gap-3">
          <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs font-semibold">
            {step}
          </span>
          <span className="font-medium text-gray-900">{title}</span>
        </div>
        {isOpen ? (
          <ChevronDown className="h-5 w-5 text-gray-500" />
        ) : (
          <ChevronRight className="h-5 w-5 text-gray-500" />
        )}
      </CollapsibleTrigger>
      <CollapsibleContent className="px-4 pb-4 pt-2 border-t bg-gray-50/50">
        {children}
      </CollapsibleContent>
    </Collapsible>
  )
}

interface MultiSelectProps {
  label: string
  options: string[]
  selected: string[]
  onChange: (selected: string[]) => void
  columns?: number
}

function MultiSelect({ label, options, selected, onChange, columns = 3 }: MultiSelectProps) {
  const toggleOption = (option: string) => {
    if (selected.includes(option)) {
      onChange(selected.filter(s => s !== option))
    } else {
      onChange([...selected, option])
    }
  }

  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium text-gray-700">{label}</Label>
      <div className={cn(
        'grid gap-2 p-3 border rounded-md bg-white max-h-48 overflow-y-auto',
        columns === 2 && 'grid-cols-2',
        columns === 3 && 'grid-cols-3',
        columns === 4 && 'grid-cols-4',
      )}>
        {options.map((option) => (
          <div key={option} className="flex items-center gap-2">
            <Checkbox
              id={`${label}-${option}`}
              checked={selected.includes(option)}
              onCheckedChange={() => toggleOption(option)}
            />
            <Label htmlFor={`${label}-${option}`} className="text-sm cursor-pointer">
              {option}
            </Label>
          </div>
        ))}
      </div>
    </div>
  )
}

export function EditRuleDialog({ rule, open, onOpenChange, isNew = false }: EditRuleDialogProps) {
  const { stageUpdate, stageCreate, setEditingRule, getDraftForRule, getRuleWithDraft } = usePricingRules()
  
  // Get the latest rule data (with any existing draft)
  const currentRule = rule ? getRuleWithDraft(rule.RuleId) : null
  const existingDraft = rule ? getDraftForRule(rule.RuleId) : null
  const originalRule = existingDraft?.originalRule || rule

  // Form state
  const [formData, setFormData] = useState<PricingRule | null>(null)

  // Initialize form data when rule changes
  useEffect(() => {
    if (currentRule) {
      setFormData({ ...currentRule })
    }
  }, [currentRule])

  if (!formData) return null

  const updateField = <K extends keyof PricingRule>(field: K, value: PricingRule[K]) => {
    setFormData(prev => prev ? { ...prev, [field]: value } : null)
  }

  const handleStageChange = () => {
    if (!formData || !originalRule) return
    
    if (isNew) {
      stageCreate(formData)
    } else {
      stageUpdate(originalRule, formData)
    }
    
    setEditingRule(null)
    onOpenChange(false)
  }

  const handleClose = () => {
    setEditingRule(null)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="!max-w-[90vw] !w-[90vw] h-[90vh] p-0 gap-0 flex flex-col" showCloseButton={false}>
        <DialogHeader className="p-4 border-b border-gray-200 shrink-0 bg-blue-50">
          <DialogTitle className="text-lg text-gray-900">
            {isNew ? 'Create New Rule' : `Edit Rule ${formData.RuleId > 0 ? `#${formData.RuleId}` : '(New)'}`}
          </DialogTitle>
          <DialogDescription className="text-gray-600">
            {isNew ? 'Configure the new pricing rule settings below' : 'Modify the pricing rule settings below'}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto">
          <div className="p-4 space-y-4">
            {/* Step 1: Apply these rules */}
            <CollapsibleSection title="Apply these rules" step={1}>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  {/* Rule Description */}
                  <div className="col-span-2 space-y-2">
                    <Label htmlFor="description">Rule Description</Label>
                    <Input
                      id="description"
                      value={formData.RuleDescription}
                      onChange={(e) => updateField('RuleDescription', e.target.value)}
                      placeholder="Enter rule description"
                    />
                  </div>

                  {/* Disallow */}
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="disallow"
                      checked={formData.Disallow}
                      onCheckedChange={(checked) => updateField('Disallow', checked === true)}
                    />
                    <Label htmlFor="disallow">Disallow</Label>
                  </div>

                  {/* Lock Period */}
                  <div className="space-y-2">
                    <Label>Lock Period</Label>
                    <Select
                      value={formData.LockPeriod.toString()}
                      onValueChange={(v) => updateField('LockPeriod', parseInt(v))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {LOCK_PERIODS.map((period) => (
                          <SelectItem key={period} value={period.toString()}>
                            {period} Days
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Fee Set */}
                  <div className="space-y-2">
                    <Label>Fee Set</Label>
                    <Select
                      value={formData.FeeSet}
                      onValueChange={(v) => updateField('FeeSet', v)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {FEE_SETS.map((feeSet) => (
                          <SelectItem key={feeSet} value={feeSet}>
                            {feeSet}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* MI Company */}
                  <div className="space-y-2">
                    <Label>MI Company</Label>
                    <Select
                      value={formData.MICompany || 'none'}
                      onValueChange={(v) => updateField('MICompany', v === 'none' ? '' : v)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select MI Company" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        {MI_COMPANIES.map((company) => (
                          <SelectItem key={company} value={company}>
                            {company}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Price */}
                  <div className="space-y-2">
                    <Label htmlFor="price">Price</Label>
                    <Input
                      id="price"
                      type="number"
                      step="0.001"
                      value={formData.Price}
                      onChange={(e) => updateField('Price', parseFloat(e.target.value) || 0)}
                    />
                  </div>

                  {/* Rate */}
                  <div className="space-y-2">
                    <Label htmlFor="rate">Rate</Label>
                    <Input
                      id="rate"
                      value={formData.Rate}
                      onChange={(e) => updateField('Rate', e.target.value)}
                      placeholder="e.g., 6.875"
                    />
                  </div>

                  {/* Fees */}
                  <div className="space-y-2">
                    <Label htmlFor="fee">Fees ($)</Label>
                    <Input
                      id="fee"
                      type="number"
                      step="0.01"
                      value={formData.Fee}
                      onChange={(e) => updateField('Fee', parseFloat(e.target.value) || 0)}
                    />
                  </div>
                </div>

                {/* Margin Type */}
                <div className="space-y-3">
                  <Label>Margin Type</Label>
                  <RadioGroup
                    value={formData.MarginType}
                    onValueChange={(v) => updateField('MarginType', v as 'percentage' | 'flat')}
                    className="flex gap-6"
                  >
                    <div className="flex items-center gap-2">
                      <RadioGroupItem value="percentage" id="margin-percent" />
                      <Label htmlFor="margin-percent">Percentage margin</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <RadioGroupItem value="flat" id="margin-flat" />
                      <Label htmlFor="margin-flat">Flat fee margin</Label>
                    </div>
                  </RadioGroup>

                  {formData.MarginType === 'percentage' ? (
                    <div className="grid grid-cols-3 gap-4 mt-3">
                      <div className="space-y-2">
                        <Label htmlFor="comp-percent">Comp %</Label>
                        <Input
                          id="comp-percent"
                          type="number"
                          step="0.001"
                          value={formData.CompPercent}
                          onChange={(e) => updateField('CompPercent', parseFloat(e.target.value) || 0)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="comp-min">Comp Min ($)</Label>
                        <Input
                          id="comp-min"
                          type="number"
                          value={formData.CompMin}
                          onChange={(e) => updateField('CompMin', parseFloat(e.target.value) || 0)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="comp-max">Comp Max ($)</Label>
                        <Input
                          id="comp-max"
                          type="number"
                          value={formData.CompMax}
                          onChange={(e) => updateField('CompMax', parseFloat(e.target.value) || 0)}
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 gap-4 mt-3">
                      <div className="space-y-2">
                        <Label htmlFor="comp-flat">Comp Flat Fee ($)</Label>
                        <Input
                          id="comp-flat"
                          type="number"
                          value={formData.CompFlatFee}
                          onChange={(e) => updateField('CompFlatFee', parseFloat(e.target.value) || 0)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="final-min">Final Price Min</Label>
                        <Input
                          id="final-min"
                          type="number"
                          value={formData.FinalPriceMin}
                          onChange={(e) => updateField('FinalPriceMin', parseFloat(e.target.value) || 0)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="final-max">Final Price Max</Label>
                        <Input
                          id="final-max"
                          type="number"
                          value={formData.FinalPriceMax}
                          onChange={(e) => updateField('FinalPriceMax', parseFloat(e.target.value) || 0)}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Checkboxes */}
                <div className="grid grid-cols-2 gap-4 pt-2">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="second-mortgage"
                      checked={formData.HasSecondMortgage}
                      onCheckedChange={(checked) => updateField('HasSecondMortgage', checked === true)}
                    />
                    <Label htmlFor="second-mortgage">Has second mortgage?</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="ignore-non-eighth"
                      checked={formData.IgnoreNonEighthRates}
                      onCheckedChange={(checked) => updateField('IgnoreNonEighthRates', checked === true)}
                    />
                    <Label htmlFor="ignore-non-eighth">Ignore Non Eighth Rates?</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="include-ufmip"
                      checked={formData.IncludeUFMIP}
                      onCheckedChange={(checked) => updateField('IncludeUFMIP', checked === true)}
                    />
                    <Label htmlFor="include-ufmip">Include UFMIP on FHA/VA?</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="finance-ufmip"
                      checked={formData.FinanceUFMIP}
                      onCheckedChange={(checked) => updateField('FinanceUFMIP', checked === true)}
                    />
                    <Label htmlFor="finance-ufmip">Finance UFMIP on FHA/VA?</Label>
                  </div>
                </div>

                {/* Max Cash Back */}
                <div className="w-1/2 space-y-2">
                  <Label htmlFor="max-cash-back">Max Cash Back to Borrower ($)</Label>
                  <Input
                    id="max-cash-back"
                    type="number"
                    value={formData.MaxCashBack}
                    onChange={(e) => updateField('MaxCashBack', parseFloat(e.target.value) || 0)}
                  />
                </div>
              </div>
            </CollapsibleSection>

            {/* Step 2: Optional Criteria */}
            <CollapsibleSection title="Select from these optional criteria" step={2} defaultOpen={false}>
              <div className="space-y-4">
                {/* Ranges */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>LTV Range</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        placeholder="Min"
                        value={formData.LTVMin}
                        onChange={(e) => updateField('LTVMin', parseFloat(e.target.value) || 0)}
                      />
                      <span>-</span>
                      <Input
                        type="number"
                        placeholder="Max"
                        value={formData.LTVMax}
                        onChange={(e) => updateField('LTVMax', parseFloat(e.target.value) || 100)}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>FICO Range</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        placeholder="Min"
                        value={formData.FICOMin}
                        onChange={(e) => updateField('FICOMin', parseInt(e.target.value) || 0)}
                      />
                      <span>-</span>
                      <Input
                        type="number"
                        placeholder="Max"
                        value={formData.FICOMax}
                        onChange={(e) => updateField('FICOMax', parseInt(e.target.value) || 850)}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Loan Amount Range</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        placeholder="Min"
                        value={formData.LoanAmountMin}
                        onChange={(e) => updateField('LoanAmountMin', parseFloat(e.target.value) || 0)}
                      />
                      <span>-</span>
                      <Input
                        type="number"
                        placeholder="Max"
                        value={formData.LoanAmountMax}
                        onChange={(e) => updateField('LoanAmountMax', parseFloat(e.target.value) || 10000000)}
                      />
                    </div>
                  </div>
                </div>

                {/* Multi-selects */}
                <div className="grid grid-cols-2 gap-4">
                  <MultiSelect
                    label="Property Types"
                    options={PROPERTY_TYPES}
                    selected={formData.PropertyTypes}
                    onChange={(selected) => updateField('PropertyTypes', selected)}
                    columns={2}
                  />
                  <MultiSelect
                    label="Property Usage"
                    options={PROPERTY_USAGE}
                    selected={formData.PropertyUsage}
                    onChange={(selected) => updateField('PropertyUsage', selected)}
                    columns={2}
                  />
                  <MultiSelect
                    label="Loan Types"
                    options={LOAN_TYPES}
                    selected={formData.LoanTypes}
                    onChange={(selected) => updateField('LoanTypes', selected)}
                    columns={2}
                  />
                  <MultiSelect
                    label="Quoting Channels"
                    options={QUOTING_CHANNELS}
                    selected={formData.QuotingChannels}
                    onChange={(selected) => updateField('QuotingChannels', selected)}
                    columns={2}
                  />
                  <MultiSelect
                    label="Lock Periods"
                    options={LOCK_PERIODS.map(p => `${p} Days`)}
                    selected={formData.LockPeriods.map(p => `${p} Days`)}
                    onChange={(selected) => updateField('LockPeriods', selected.map(s => parseInt(s)))}
                    columns={3}
                  />
                  <MultiSelect
                    label="Borrower Filters"
                    options={BORROWER_FILTERS}
                    selected={formData.BorrowerFilters}
                    onChange={(selected) => updateField('BorrowerFilters', selected)}
                    columns={2}
                  />
                  <MultiSelect
                    label="Point Groups"
                    options={POINT_GROUPS}
                    selected={formData.PointGroups}
                    onChange={(selected) => updateField('PointGroups', selected)}
                    columns={2}
                  />
                  <MultiSelect
                    label="States"
                    options={STATES}
                    selected={formData.States}
                    onChange={(selected) => updateField('States', selected)}
                    columns={4}
                  />
                </div>
              </div>
            </CollapsibleSection>

            {/* Step 3: Filter Programs */}
            <CollapsibleSection title="Filter the programs the rule runs against" step={3} defaultOpen={false}>
              <div className="space-y-4">
                <MultiSelect
                  label="Lenders"
                  options={LENDERS}
                  selected={formData.Lenders}
                  onChange={(selected) => updateField('Lenders', selected)}
                  columns={3}
                />
                <div className="grid grid-cols-2 gap-4">
                  <MultiSelect
                    label="Product Families"
                    options={PRODUCT_FAMILIES}
                    selected={formData.ProductFamilies}
                    onChange={(selected) => updateField('ProductFamilies', selected)}
                    columns={2}
                  />
                  <MultiSelect
                    label="Product Classes"
                    options={PRODUCT_CLASSES}
                    selected={formData.ProductClasses}
                    onChange={(selected) => updateField('ProductClasses', selected)}
                    columns={2}
                  />
                  <MultiSelect
                    label="Product Types"
                    options={PRODUCT_TYPES}
                    selected={formData.ProductTypes}
                    onChange={(selected) => updateField('ProductTypes', selected)}
                    columns={2}
                  />
                  <MultiSelect
                    label="Product Terms"
                    options={PRODUCT_TERMS}
                    selected={formData.ProductTerms}
                    onChange={(selected) => updateField('ProductTerms', selected)}
                    columns={2}
                  />
                </div>
              </div>
            </CollapsibleSection>

            {/* Step 4: Schedule */}
            <CollapsibleSection title="Schedule when this rule applies" step={4} defaultOpen={false}>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="start-date">Start Date</Label>
                  <Input
                    id="start-date"
                    type="date"
                    value={formData.StartDate || ''}
                    onChange={(e) => updateField('StartDate', e.target.value || null)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="end-date">End Date</Label>
                  <Input
                    id="end-date"
                    type="date"
                    value={formData.EndDate || ''}
                    onChange={(e) => updateField('EndDate', e.target.value || null)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="start-time">Start Time</Label>
                  <Input
                    id="start-time"
                    type="time"
                    value={formData.StartTime || ''}
                    onChange={(e) => updateField('StartTime', e.target.value || null)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="end-time">End Time</Label>
                  <Input
                    id="end-time"
                    type="time"
                    value={formData.EndTime || ''}
                    onChange={(e) => updateField('EndTime', e.target.value || null)}
                  />
                </div>
              </div>
            </CollapsibleSection>

            {/* Visibility Notice */}
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
                <div className="space-y-2">
                  <p className="text-sm font-medium text-red-800">Visibility Settings</p>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="hide-in-quote"
                      checked={formData.HideInQuoteAdjustments}
                      onCheckedChange={(checked) => updateField('HideInQuoteAdjustments', checked === true)}
                    />
                    <Label htmlFor="hide-in-quote" className="text-sm text-red-700">
                      Do NOT show this rule details in quote adjustments
                    </Label>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Sticky Footer */}
        <div className="flex items-center justify-between p-4 border-t border-gray-200 bg-gray-50 shrink-0">
          <Button variant="outline" onClick={handleClose} className="border-gray-300">
            Return to Pricing
          </Button>
          <Button onClick={handleStageChange} className="bg-teal-500 hover:bg-teal-600 text-white font-medium">
            Stage Change
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
