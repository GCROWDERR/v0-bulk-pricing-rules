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
  marginMin: string
  marginMax: string
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
    marginMin: (currentRule.MarginMin ?? currentRule.CompPercent).toString(),
    marginMax: (currentRule.MarginMax ?? currentRule.CompPercent).toString(),
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
      marginMin: (currentRule.MarginMin ?? currentRule.CompPercent).toString(),
      marginMax: (currentRule.MarginMax ?? currentRule.CompPercent).toString(),
      price: currentRule.Price.toString(),
      fee: currentRule.Fee.toString(),
      ficoMin: currentRule.FICOMin.toString(),
      ficoMax: currentRule.FICOMax.toString(),
      loanAmountMin: currentRule.LoanAmountMin.toString(),
      loanAmountMax: currentRule.LoanAmountMax.toString(),
    })
    
    // Calculate modified fields
    const modified = new Set<string>()
    if ((currentRule.MarginMin ?? currentRule.CompPercent) !== (originalRule.MarginMin ?? originalRule.CompPercent)) modified.add('marginMin')
    if ((currentRule.MarginMax ?? currentRule.CompPercent) !== (originalRule.MarginMax ?? originalRule.CompPercent)) modified.add('marginMax')
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
      case 'marginMin':
        const marginMin = parseFloat(value) || 0
        if (marginMin !== (currentRule.MarginMin ?? currentRule.CompPercent)) {
          updates.MarginMin = marginMin
          updates.CompPercent = marginMin // Keep CompPercent in sync for backward compatibility
        }
        break
      case 'marginMax':
        const marginMax = parseFloat(value) || 0
        if (marginMax !== (currentRule.MarginMax ?? currentRule.CompPercent)) {
          updates.MarginMax = marginMax
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
      marginMin: (originalRule.MarginMin ?? originalRule.CompPercent).toString(),
      marginMax: (originalRule.MarginMax ?? originalRule.CompPercent).toString(),
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
      
      <div className="grid grid-cols-5 gap-3">
        {/* Margin Range (Min/Max) */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <Label className="text-xs text-gray-600">Margin %</Label>
            {(modifiedFields.has('marginMin') || modifiedFields.has('marginMax')) && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-teal-50 text-teal-600 border-teal-300">
                Staged
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-1">
            <Input
              id={`margin-min-${rule.RuleId}`}
              type="number"
              step="0.001"
              placeholder="Min"
              value={fields.marginMin}
              onChange={(e) => handleFieldChange('marginMin', e.target.value)}
              onBlur={() => handleBlur('marginMin')}
              tabIndex={1}
              aria-label="Margin minimum percentage"
              className={cn(
                'h-8 text-sm font-mono w-16',
                modifiedFields.has('marginMin') && 'border-teal-400 bg-teal-50/50'
              )}
            />
            <span className="text-gray-400 text-xs">-</span>
            <Input
              id={`margin-max-${rule.RuleId}`}
              type="number"
              step="0.001"
              placeholder="Max"
              value={fields.marginMax}
              onChange={(e) => handleFieldChange('marginMax', e.target.value)}
              onBlur={() => handleBlur('marginMax')}
              tabIndex={2}
              aria-label="Margin maximum percentage"
              className={cn(
                'h-8 text-sm font-mono w-16',
                modifiedFields.has('marginMax') && 'border-teal-400 bg-teal-50/50'
              )}
            />
          </div>
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
            tabIndex={3}
            aria-label="Price"
            className={cn(
              'h-8 text-sm font-mono w-20',
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
            tabIndex={4}
            aria-label="Fee in dollars"
            className={cn(
              'h-8 text-sm font-mono w-20',
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
              tabIndex={5}
              aria-label="FICO minimum score"
              className={cn(
                'h-8 text-sm font-mono w-14',
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
              tabIndex={6}
              aria-label="FICO maximum score"
              className={cn(
                'h-8 text-sm font-mono w-14',
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
              tabIndex={7}
              aria-label="Loan amount minimum"
              className={cn(
                'h-8 text-sm font-mono w-20',
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
              tabIndex={8}
              aria-label="Loan amount maximum"
              className={cn(
                'h-8 text-sm font-mono w-20',
                modifiedFields.has('loanAmountMax') && 'border-teal-400 bg-teal-50/50'
              )}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
