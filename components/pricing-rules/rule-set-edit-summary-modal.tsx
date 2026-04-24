'use client'

import { useMemo } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Layers, Plus, Pencil, ArrowRight, CheckCircle2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { PricingRule } from '@/lib/pricing-rules-data'

// --------------------------------------------------
// Field display helpers
// --------------------------------------------------

const FIELD_LABELS: Partial<Record<keyof PricingRule, string>> = {
  RuleDescription: 'Description',
  Fee: 'Fee ($)',
  Price: 'Price',
  CompPercent: 'Margin %',
  Active: 'Active',
  Disallow: 'Disallow',
  LockPeriod: 'Lock Period',
  FeeSet: 'Fee Set',
  MICompany: 'MI Company',
  Rate: 'Rate',
  MarginType: 'Margin Type',
  CompMin: 'Comp Min',
  CompMax: 'Comp Max',
  CompFlatFee: 'Comp Flat Fee',
  FinalPriceMin: 'Final Price Min',
  FinalPriceMax: 'Final Price Max',
  HasSecondMortgage: 'Has 2nd Mortgage',
  IgnoreNonEighthRates: 'Ignore Non-1/8 Rates',
  IncludeUFMIP: 'Include UFMIP',
  MaxCashBack: 'Max Cash Back',
  FinanceUFMIP: 'Finance UFMIP',
  LTVMin: 'LTV Min',
  LTVMax: 'LTV Max',
  FICOMin: 'FICO Min',
  FICOMax: 'FICO Max',
  LoanAmountMin: 'Loan Amount Min',
  LoanAmountMax: 'Loan Amount Max',
  PropertyTypes: 'Property Types',
  PropertyUsage: 'Property Usage',
  LoanTypes: 'Loan Types',
  QuotingChannels: 'Quoting Channels',
  LockPeriods: 'Lock Periods',
  BorrowerFilters: 'Borrower Filters',
  PointGroups: 'Point Groups',
  States: 'States',
  ProductFamilies: 'Product Families',
  ProductClasses: 'Product Classes',
  ProductTypes: 'Product Types',
  ProductTerms: 'Product Terms',
  StartDate: 'Start Date',
  EndDate: 'End Date',
  StartTime: 'Start Time',
  EndTime: 'End Time',
  HideInQuoteAdjustments: 'Hide in Quotes',
  RuleSetName: 'Rule Set Name',
}

// Fields that are structural to the rule set (not surfaced as "changes")
const SKIP_FIELDS = new Set<string>(['RuleId', 'RuleIsDeleted', 'RuleSetId'])

function formatFieldValue(key: string, value: unknown): string {
  if (value === null || value === undefined) return '—'
  if (typeof value === 'boolean') return value ? 'Yes' : 'No'
  if (Array.isArray(value)) {
    if (value.length === 0) return 'None'
    if (value.length <= 3) return value.join(', ')
    return `${value.slice(0, 3).join(', ')} +${value.length - 3} more`
  }
  if (typeof value === 'number') {
    if (key.includes('Amount') || key.includes('Fee') || key === 'MaxCashBack' || key.includes('Comp')) {
      return `$${value.toLocaleString()}`
    }
    if (key.includes('Percent') || key.includes('LTV')) return `${value}%`
    return String(value)
  }
  return String(value)
}

// --------------------------------------------------
// Types
// --------------------------------------------------

export interface RuleSetEditDiff {
  rule: PricingRule            // existing rule (for updates) OR new rule (for creates)
  updatedRule: PricingRule     // the new values
  isNew: boolean
  changedFields: string[]
}

interface RuleSetEditSummaryModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  ruleSetName: string
  diffs: RuleSetEditDiff[]
  onConfirm: () => void
}

// --------------------------------------------------
// Sub-components
// --------------------------------------------------

function FieldDiffRow({ fieldKey, original, updated }: {
  fieldKey: string
  original: unknown
  updated: unknown
}) {
  const label = FIELD_LABELS[fieldKey as keyof PricingRule] ?? fieldKey
  const origStr = formatFieldValue(fieldKey, original)
  const updStr = formatFieldValue(fieldKey, updated)

  return (
    <div className="grid grid-cols-[160px_1fr_20px_1fr] items-start gap-2 py-1.5 border-b border-gray-100 last:border-0 text-sm">
      <span className="text-gray-500 font-medium truncate">{label}</span>
      <span className="text-gray-400 line-through truncate">{origStr}</span>
      <ArrowRight className="h-3.5 w-3.5 text-gray-400 mt-0.5 shrink-0" />
      <span className="text-blue-700 font-medium truncate">{updStr}</span>
    </div>
  )
}

function RuleDiffCard({ diff, index }: { diff: RuleSetEditDiff; index: number }) {
  const visibleFields = diff.changedFields.filter(f => !SKIP_FIELDS.has(f))

  return (
    <div className={cn(
      'rounded-lg border overflow-hidden',
      diff.isNew ? 'border-teal-200' : 'border-gray-200'
    )}>
      {/* Card header */}
      <div className={cn(
        'flex items-center justify-between px-4 py-2.5',
        diff.isNew ? 'bg-teal-50' : 'bg-gray-50'
      )}>
        <div className="flex items-center gap-2 min-w-0">
          {diff.isNew ? (
            <Plus className="h-3.5 w-3.5 text-teal-600 shrink-0" />
          ) : (
            <Pencil className="h-3.5 w-3.5 text-blue-600 shrink-0" />
          )}
          <span className="text-sm font-medium text-gray-900 truncate">
            {diff.isNew ? diff.updatedRule.RuleDescription : diff.rule.RuleDescription}
          </span>
        </div>
        <div className="flex items-center gap-2 shrink-0 ml-3">
          <Badge
            variant="outline"
            className={cn(
              'text-xs',
              diff.isNew
                ? 'bg-teal-50 text-teal-700 border-teal-300'
                : 'bg-blue-50 text-blue-700 border-blue-300'
            )}
          >
            {diff.isNew ? 'New rule' : `${visibleFields.length} change${visibleFields.length !== 1 ? 's' : ''}`}
          </Badge>
          <span className="text-xs text-gray-400">#{diff.isNew ? diff.updatedRule.RuleId : diff.rule.RuleId}</span>
        </div>
      </div>

      {/* Diff rows */}
      {visibleFields.length > 0 && (
        <div className="px-4 py-2">
          {visibleFields.map((field) => (
            <FieldDiffRow
              key={field}
              fieldKey={field}
              original={diff.isNew ? undefined : diff.rule[field as keyof PricingRule]}
              updated={diff.updatedRule[field as keyof PricingRule]}
            />
          ))}
        </div>
      )}

      {/* New rule — show key values */}
      {diff.isNew && (
        <div className="px-4 py-2 grid grid-cols-3 gap-3 text-sm border-t border-teal-100">
          <div>
            <span className="text-gray-500 block text-xs">FICO Range</span>
            <span className="font-medium">{diff.updatedRule.FICOMin} – {diff.updatedRule.FICOMax}</span>
          </div>
          <div>
            <span className="text-gray-500 block text-xs">Loan Amount</span>
            <span className="font-medium">
              ${(diff.updatedRule.LoanAmountMin / 1000).toFixed(0)}K – ${(diff.updatedRule.LoanAmountMax / 1000).toFixed(0)}K
            </span>
          </div>
          <div>
            <span className="text-gray-500 block text-xs">Product</span>
            <span className="font-medium">{diff.updatedRule.ProductFamilies[0] ?? '—'}</span>
          </div>
        </div>
      )}
    </div>
  )
}

// --------------------------------------------------
// Main Modal
// --------------------------------------------------

export function RuleSetEditSummaryModal({
  open,
  onOpenChange,
  ruleSetName,
  diffs,
  onConfirm,
}: RuleSetEditSummaryModalProps) {
  const { updates, creates, unchangedCount } = useMemo(() => {
    const updates = diffs.filter(d => !d.isNew && d.changedFields.filter(f => !SKIP_FIELDS.has(f)).length > 0)
    const creates = diffs.filter(d => d.isNew)
    const unchangedCount = diffs.filter(d => !d.isNew && d.changedFields.filter(f => !SKIP_FIELDS.has(f)).length === 0).length
    return { updates, creates, unchangedCount }
  }, [diffs])

  const totalChanges = updates.length + creates.length

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl w-full flex flex-col gap-0 p-0 font-sans overflow-hidden" style={{ maxHeight: 'min(90vh, 720px)', height: 'min(90vh, 720px)' }}>
        {/* Header */}
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-gray-200 shrink-0">
          <div className="flex items-start gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-blue-50 border border-blue-200 shrink-0">
              <Layers className="h-5 w-5 text-blue-600" />
            </div>
            <div className="min-w-0">
              <DialogTitle className="text-gray-900 text-base font-semibold leading-tight">
                Review rule set changes
              </DialogTitle>
              <DialogDescription className="text-gray-500 text-sm mt-0.5">
                <span className="font-medium text-gray-700">{ruleSetName}</span>
                {' — '}confirm the changes below before staging as drafts
              </DialogDescription>
            </div>
          </div>

          {/* Summary pills */}
          <div className="flex items-center gap-2 mt-4 flex-wrap">
            {updates.length > 0 && (
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-medium">
                <Pencil className="h-3 w-3" />
                {updates.length} rule{updates.length !== 1 ? 's' : ''} updated
              </div>
            )}
            {creates.length > 0 && (
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-50 border border-teal-200 text-teal-700 text-xs font-medium">
                <Plus className="h-3 w-3" />
                {creates.length} new rule{creates.length !== 1 ? 's' : ''} added
              </div>
            )}
            {unchangedCount > 0 && (
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-gray-100 border border-gray-200 text-gray-500 text-xs font-medium">
                <CheckCircle2 className="h-3 w-3" />
                {unchangedCount} unchanged
              </div>
            )}
          </div>
        </DialogHeader>

        {/* Body */}
        {totalChanges === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center py-16 px-6 gap-3 text-center overflow-hidden">
            <CheckCircle2 className="h-10 w-10 text-gray-300" />
            <p className="text-gray-500 text-sm">No changes detected. All rules match their existing values.</p>
          </div>
        ) : (
          <ScrollArea className="flex-1 overflow-hidden">
            <div className="px-6 py-4 space-y-3">
              {/* Updated rules */}
              {updates.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Updated rules</p>
                  {updates.map((diff, i) => (
                    <RuleDiffCard key={diff.rule.RuleId} diff={diff} index={i} />
                  ))}
                </div>
              )}

              {/* New rules */}
              {creates.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">New rules</p>
                  {creates.map((diff, i) => (
                    <RuleDiffCard key={diff.updatedRule.RuleId} diff={diff} index={i} />
                  ))}
                </div>
              )}
            </div>
          </ScrollArea>
        )}

        {/* Footer */}
        <DialogFooter className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex-none flex items-center justify-between sm:justify-between">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="border-gray-300 text-gray-600"
          >
            Go back
          </Button>
          <Button
            onClick={() => {
              onConfirm()
              onOpenChange(false)
            }}
            disabled={totalChanges === 0}
            className="bg-blue-600 hover:bg-blue-800 active:bg-blue-900 text-white font-medium rounded"
          >
            Confirm &amp; stage{totalChanges > 0 ? ` ${totalChanges} change${totalChanges !== 1 ? 's' : ''}` : ''}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
