'use client'

import { useState, useEffect, useCallback } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { RotateCcw } from 'lucide-react'
import { usePricingRules } from '@/lib/pricing-rules-context'
import type { PricingRule } from '@/lib/pricing-rules-data'
import { cn } from '@/lib/utils'

interface InlineQuickEditProps {
  rule: PricingRule
}

interface FieldState {
  compPercent: string
  compMin: string
  compMax: string
  price: string
  fee: string
  ficoMin: string
  ficoMax: string
  loanAmountMin: string
  loanAmountMax: string
}

export function InlineQuickEdit({ rule }: InlineQuickEditProps) {
  const { stageUpdate, getDraftForRule, discardDraft, getRuleWithDraft } = usePricingRules()
  const draft = getDraftForRule(rule.RuleId)
  const currentRule = getRuleWithDraft(rule.RuleId)

  // Get the original rule (before any drafts)
  const originalRule = draft?.originalRule || rule

  // Local state for form fields
  const [fields, setFields] = useState<FieldState>({
    compPercent: currentRule.CompPercent.toString(),
    compMin: (currentRule.CompMin ?? 0).toString(),
    compMax: (currentRule.CompMax ?? 0).toString(),
    price: currentRule.Price.toString(),
    fee: currentRule.Fee.toString(),
    ficoMin: currentRule.FICOMin.toString(),
    ficoMax: currentRule.FICOMax.toString(),
    loanAmountMin: currentRule.LoanAmountMin.toString(),
    loanAmountMax: currentRule.LoanAmountMax.toString(),
  })

  // Track which fields have been modified from original
  const [modifiedFields, setModifiedFields] = useState<Set<string>>(new Set())

  // Update local state when rule changes
  useEffect(() => {
    setFields({
      compPercent: currentRule.CompPercent.toString(),
      compMin: (currentRule.CompMin ?? 0).toString(),
      compMax: (currentRule.CompMax ?? 0).toString(),
      price: currentRule.Price.toString(),
      fee: currentRule.Fee.toString(),
      ficoMin: currentRule.FICOMin.toString(),
      ficoMax: currentRule.FICOMax.toString(),
      loanAmountMin: currentRule.LoanAmountMin.toString(),
      loanAmountMax: currentRule.LoanAmountMax.toString(),
    })
    
    // Calculate modified fields
    const modified = new Set<string>()
    if (currentRule.CompPercent !== originalRule.CompPercent) modified.add('compPercent')
    if ((currentRule.CompMin ?? 0) !== (originalRule.CompMin ?? 0)) modified.add('compMin')
    if ((currentRule.CompMax ?? 0) !== (originalRule.CompMax ?? 0)) modified.add('compMax')
    if (currentRule.Price !== originalRule.Price) modified.add('price')
    if (currentRule.Fee !== originalRule.Fee) modified.add('fee')
    if (currentRule.FICOMin !== originalRule.FICOMin) modified.add('ficoMin')
    if (currentRule.FICOMax !== originalRule.FICOMax) modified.add('ficoMax')
    if (currentRule.LoanAmountMin !== originalRule.LoanAmountMin) modified.add('loanAmountMin')
    if (currentRule.LoanAmountMax !== originalRule.LoanAmountMax) modified.add('loanAmountMax')
    setModifiedFields(modified)
  }, [currentRule, originalRule])

  // Debounced update function
  const handleFieldChange = useCallback((field: keyof FieldState, value: string) => {
    setFields(prev => ({ ...prev, [field]: value }))
  }, [])

  // Apply changes on blur
  const handleBlur = useCallback((field: keyof FieldState) => {
    const updates: Partial<PricingRule> = {}
    const value = fields[field]

    switch (field) {
      case 'price':
        const price = parseFloat(value) || 0
        if (price !== currentRule.Price) {
          updates.Price = price
        }
        break
      case 'fee':
        const fee = parseFloat(value) || 0
        if (fee !== currentRule.Fee) {
          updates.Fee = fee
        }
        break
      case 'compPercent':
        const compPercent = parseFloat(value) || 0
        if (compPercent !== currentRule.CompPercent) {
          updates.CompPercent = compPercent
        }
        break
      case 'compMin':
        const compMin = parseFloat(value) || 0
        if (compMin !== (currentRule.CompMin ?? 0)) {
          updates.CompMin = compMin
        }
        break
      case 'compMax':
        const compMax = parseFloat(value) || 0
        if (compMax !== (currentRule.CompMax ?? 0)) {
          updates.CompMax = compMax
        }
        break
      case 'ficoMin':
        const ficoMin = parseInt(value) || 0
        if (ficoMin !== currentRule.FICOMin) {
          updates.FICOMin = ficoMin
        }
        break
      case 'ficoMax':
        const ficoMax = parseInt(value) || 850
        if (ficoMax !== currentRule.FICOMax) {
          updates.FICOMax = ficoMax
        }
        break
      case 'loanAmountMin':
        const loanMin = parseFloat(value.replace(/[,$]/g, '')) || 0
        if (loanMin !== currentRule.LoanAmountMin) {
          updates.LoanAmountMin = loanMin
        }
        break
      case 'loanAmountMax':
        const loanMax = parseFloat(value.replace(/[,$]/g, '')) || 0
        if (loanMax !== currentRule.LoanAmountMax) {
          updates.LoanAmountMax = loanMax
        }
        break
    }

    if (Object.keys(updates).length > 0) {
      stageUpdate(originalRule, { ...currentRule, ...updates })
    }
  }, [fields, currentRule, originalRule, stageUpdate])

  const handleReset = () => {
    discardDraft(rule.RuleId)
    setFields({
      compPercent: originalRule.CompPercent.toString(),
      compMin: (originalRule.CompMin ?? 0).toString(),
      compMax: (originalRule.CompMax ?? 0).toString(),
      price: originalRule.Price.toString(),
      fee: originalRule.Fee.toString(),
      ficoMin: originalRule.FICOMin.toString(),
      ficoMax: originalRule.FICOMax.toString(),
      loanAmountMin: originalRule.LoanAmountMin.toString(),
      loanAmountMax: originalRule.LoanAmountMax.toString(),
    })
    setModifiedFields(new Set())
  }

  const formatLoanAmount = (value: string) => {
    const num = parseFloat(value.replace(/[,$]/g, ''))
    if (isNaN(num)) return value
    return new Intl.NumberFormat('en-US').format(num)
  }

  return (
    <div className="bg-blue-50 border-l-4 border-blue-600 p-4 ml-4 mr-4 mb-2 rounded-r-lg">
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-sm font-semibold text-gray-900">Quick Edit</h4>
        {modifiedFields.size > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleReset}
            className="text-coral-500 hover:text-coral-600 hover:bg-coral-50 gap-1"
          >
            <RotateCcw className="h-3 w-3" />
            Reset Changes
          </Button>
        )}
      </div>
      
      <div className="grid grid-cols-7 gap-3">
        {/* Comp % */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <Label htmlFor={`comp-${rule.RuleId}`} className="text-xs text-gray-600">
              Comp %
            </Label>
            {modifiedFields.has('compPercent') && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-teal-50 text-teal-600 border-teal-300">
                Staged
              </Badge>
            )}
          </div>
          <Input
            id={`comp-${rule.RuleId}`}
            type="number"
            step="0.001"
            value={fields.compPercent}
            onChange={(e) => handleFieldChange('compPercent', e.target.value)}
            onBlur={() => handleBlur('compPercent')}
            tabIndex={1}
            aria-label="Compensation percentage"
            className={cn(
              'h-8 text-sm font-mono w-[72px]',
              modifiedFields.has('compPercent') && 'border-teal-400 bg-teal-50/50'
            )}
          />
        </div>

        {/* Comp Min $ */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <Label htmlFor={`comp-min-${rule.RuleId}`} className="text-xs text-gray-600">
              Comp Min $
            </Label>
            {modifiedFields.has('compMin') && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-teal-50 text-teal-600 border-teal-300">
                Staged
              </Badge>
            )}
          </div>
          <Input
            id={`comp-min-${rule.RuleId}`}
            type="number"
            step="0.01"
            value={fields.compMin}
            onChange={(e) => handleFieldChange('compMin', e.target.value)}
            onBlur={() => handleBlur('compMin')}
            tabIndex={2}
            aria-label="Compensation minimum in dollars"
            className={cn(
              'h-8 text-sm font-mono w-[72px]',
              modifiedFields.has('compMin') && 'border-teal-400 bg-teal-50/50'
            )}
          />
        </div>

        {/* Comp Max $ */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <Label htmlFor={`comp-max-${rule.RuleId}`} className="text-xs text-gray-600">
              Comp Max $
            </Label>
            {modifiedFields.has('compMax') && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-teal-50 text-teal-600 border-teal-300">
                Staged
              </Badge>
            )}
          </div>
          <Input
            id={`comp-max-${rule.RuleId}`}
            type="number"
            step="0.01"
            value={fields.compMax}
            onChange={(e) => handleFieldChange('compMax', e.target.value)}
            onBlur={() => handleBlur('compMax')}
            tabIndex={3}
            aria-label="Compensation maximum in dollars"
            className={cn(
              'h-8 text-sm font-mono w-[72px]',
              modifiedFields.has('compMax') && 'border-teal-400 bg-teal-50/50'
            )}
          />
        </div>

        {/* Price */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <Label htmlFor={`price-${rule.RuleId}`} className="text-xs text-gray-600">
              Price
            </Label>
            {modifiedFields.has('price') && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-teal-50 text-teal-600 border-teal-300">
                Staged
              </Badge>
            )}
          </div>
          <Input
            id={`price-${rule.RuleId}`}
            type="number"
            step="0.001"
            value={fields.price}
            onChange={(e) => handleFieldChange('price', e.target.value)}
            onBlur={() => handleBlur('price')}
            tabIndex={4}
            aria-label="Price"
            className={cn(
              'h-8 text-sm font-mono w-[72px]',
              modifiedFields.has('price') && 'border-teal-400 bg-teal-50/50'
            )}
          />
        </div>

        {/* Fee */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <Label htmlFor={`fee-${rule.RuleId}`} className="text-xs text-gray-600">
              Fee ($)
            </Label>
            {modifiedFields.has('fee') && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-teal-50 text-teal-600 border-teal-300">
                Staged
              </Badge>
            )}
          </div>
          <Input
            id={`fee-${rule.RuleId}`}
            type="number"
            step="0.01"
            value={fields.fee}
            onChange={(e) => handleFieldChange('fee', e.target.value)}
            onBlur={() => handleBlur('fee')}
            tabIndex={5}
            aria-label="Fee in dollars"
            className={cn(
              'h-8 text-sm font-mono w-[72px]',
              modifiedFields.has('fee') && 'border-teal-400 bg-teal-50/50'
            )}
          />
        </div>

        {/* FICO Range */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <Label className="text-xs text-gray-600">FICO Range</Label>
            {(modifiedFields.has('ficoMin') || modifiedFields.has('ficoMax')) && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-teal-50 text-teal-600 border-teal-300">
                Staged
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-1">
            <Input
              id={`fico-min-${rule.RuleId}`}
              type="number"
              placeholder="Min"
              value={fields.ficoMin}
              onChange={(e) => handleFieldChange('ficoMin', e.target.value)}
              onBlur={() => handleBlur('ficoMin')}
              tabIndex={6}
              aria-label="FICO minimum score"
              className={cn(
                'h-8 text-sm font-mono w-[72px]',
                modifiedFields.has('ficoMin') && 'border-teal-400 bg-teal-50/50'
              )}
            />
            <span className="text-gray-400 text-xs">-</span>
            <Input
              id={`fico-max-${rule.RuleId}`}
              type="number"
              placeholder="Max"
              value={fields.ficoMax}
              onChange={(e) => handleFieldChange('ficoMax', e.target.value)}
              onBlur={() => handleBlur('ficoMax')}
              tabIndex={7}
              aria-label="FICO maximum score"
              className={cn(
                'h-8 text-sm font-mono w-[72px]',
                modifiedFields.has('ficoMax') && 'border-teal-400 bg-teal-50/50'
              )}
            />
          </div>
        </div>

        {/* Loan Amount Range */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <Label className="text-xs text-gray-600">Loan Amount</Label>
            {(modifiedFields.has('loanAmountMin') || modifiedFields.has('loanAmountMax')) && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-teal-50 text-teal-600 border-teal-300">
                Staged
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-1">
            <Input
              id={`loan-min-${rule.RuleId}`}
              type="text"
              placeholder="Min"
              value={formatLoanAmount(fields.loanAmountMin)}
              onChange={(e) => handleFieldChange('loanAmountMin', e.target.value.replace(/[,$]/g, ''))}
              onBlur={() => handleBlur('loanAmountMin')}
              tabIndex={8}
              aria-label="Loan amount minimum"
              className={cn(
                'h-8 text-sm font-mono w-[88px]',
                modifiedFields.has('loanAmountMin') && 'border-teal-400 bg-teal-50/50'
              )}
            />
            <span className="text-gray-400 text-xs">-</span>
            <Input
              id={`loan-max-${rule.RuleId}`}
              type="text"
              placeholder="Max"
              value={formatLoanAmount(fields.loanAmountMax)}
              onChange={(e) => handleFieldChange('loanAmountMax', e.target.value.replace(/[,$]/g, ''))}
              onBlur={() => handleBlur('loanAmountMax')}
              tabIndex={9}
              aria-label="Loan amount maximum"
              className={cn(
                'h-8 text-sm font-mono w-[88px]',
                modifiedFields.has('loanAmountMax') && 'border-teal-400 bg-teal-50/50'
              )}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
