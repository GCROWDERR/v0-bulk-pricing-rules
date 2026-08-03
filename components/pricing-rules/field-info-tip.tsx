'use client'

import { Info } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

/** Tooltip copy from Loantek portal pricing-rules edit (Step1 / Step2 InfoTips). */
export const RULE_FIELD_TOOLTIPS = {
  description:
    'Enter a brief description to identify the rule in your pricing adjustments.',
  disallow:
    "Allows you to have overlays to the investors i.e., if an investor goes to 580 FICO, but you don't want to quote below 620 or if you don't want to quote specific products on a partner channel.",
  lockPeriod:
    'Different from lock period filter below, use this to set the requested lock period.',
  feeSet:
    'Fee Sets are built-in Fees and assigned here. Assign by investor, loan purpose, or quoting channel, etc.',
  finalPriceMax:
    "Works only when best ex method is 'By Rate' or 'By Points Group'.",
  compPercent:
    'Use with your standard comp percentage to make min/max amount per loan.',
  maxCashBack:
    "Enter as a positive number. Limits the rebate for No Fee quotes. Works regardless of best ex method selected. If best ex method chosen is 'By Rate', you may see multiple offers with the same rebate.",
  pointGroups:
    'If any of these are selected, this rule will only be applied after pricing has been completed.',
  selectedStates:
    'Selecting a single state will allow counties for that state to also be selected.',
  applyFilters:
    'Leaving options unselected applies this rule to all programs in this category.',
  schedule:
    'Start and End dates/times are not required, and should only be used for special, time-sensitive pricing. Times are in ET.',
} as const

interface FieldInfoTipProps {
  content: string
  className?: string
  iconClassName?: string
}

export function FieldInfoTip({
  content,
  className,
  iconClassName = 'h-3.5 w-3.5 text-blue-500',
}: FieldInfoTipProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          className={className ?? 'inline-flex shrink-0 rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0157FF]'}
          aria-label="More information"
        >
          <Info className={iconClassName} />
        </button>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-xs text-left text-balance">
        {content}
      </TooltipContent>
    </Tooltip>
  )
}
