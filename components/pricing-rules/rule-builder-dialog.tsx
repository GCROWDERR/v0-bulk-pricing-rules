'use client'

import { useState, useMemo, useCallback, useRef, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import {
  Plus,
  Trash2,
  AlertTriangle,
  AlertCircle,
  ChevronDown,
  ChevronRight,
  Wand2,
  Search,
  Undo2,
} from 'lucide-react'
import { usePricingRules } from '@/lib/pricing-rules-context'
import { RuleSetEditSummaryModal } from './rule-set-edit-summary-modal'
import type { RuleSetEditDiff } from './rule-set-edit-summary-modal'
import { 
  LENDERS, 
  PRODUCT_FAMILIES, 
  PROPERTY_TYPES,
  PROPERTY_USAGE,
  LOAN_TYPES,
  QUOTING_CHANNELS,
  LOCK_PERIODS,
  BORROWER_FILTERS,
  POINT_GROUPS,
  STATES,
  PRODUCT_CLASSES,
  PRODUCT_TYPES,
  PRODUCT_TERMS,
  FEE_SETS,
  MI_COMPANIES,
  createBlankRule,
  generateRuleSetId,
  getChangedFields,
} from '@/lib/pricing-rules-data'
import type { PricingRule } from '@/lib/pricing-rules-data'
import { cn } from '@/lib/utils'

interface RuleBuilderDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** When provided, the dialog opens in "Edit Rule Set" mode (Mode B) */
  editingRuleSetId?: string | null
}

type DimensionType = 'loanAmount' | 'fico' | 'ltv' | 'price' | 'fee' | 'margin'
type CellValueType = 'price' | 'fee' | 'margin' | 'disallow'

interface Range {
  id: string
  min: number
  max: number
}

interface ValidationIssue {
  type: 'gap' | 'overlap'
  message: string
  indices: [number, number]
}

const DIMENSION_OPTIONS: { value: DimensionType; label: string; unit: string }[] = [
  { value: 'loanAmount', label: 'Loan Amount', unit: '$' },
  { value: 'fico', label: 'FICO Score', unit: '' },
  { value: 'ltv', label: 'LTV', unit: '%' },
  { value: 'price', label: 'Price', unit: '' },
  { value: 'fee', label: 'Fee', unit: '$' },
  { value: 'margin', label: 'Margin %', unit: '%' },
]

const CELL_VALUE_OPTIONS: { value: CellValueType; label: string }[] = [
  { value: 'price', label: 'Price' },
  { value: 'fee', label: 'Fee' },
  { value: 'margin', label: 'Margin %' },
  { value: 'disallow', label: 'Disallow' },
]

type BuilderMode = 'matrix' | 'list'

interface RangeWithValue extends Range {
  value: string
}

function generateId() {
  return Math.random().toString(36).substr(2, 9)
}

function validateRanges(ranges: Range[]): ValidationIssue[] {
  const issues: ValidationIssue[] = []
  const sorted = [...ranges].sort((a, b) => a.min - b.min)

  for (let i = 0; i < sorted.length - 1; i++) {
    const current = sorted[i]
    const next = sorted[i + 1]

    // Check for gap
    if (current.max < next.min - 1) {
      issues.push({
        type: 'gap',
        message: `Gap: ${current.max + 1} to ${next.min - 1} not covered`,
        indices: [i, i + 1],
      })
    }

    // Check for overlap
    if (current.max >= next.min) {
      issues.push({
        type: 'overlap',
        message: `Overlap: ${next.min} to ${current.max}`,
        indices: [i, i + 1],
      })
    }
  }

  return issues
}

function formatRangeLabel(range: Range, dimension: DimensionType): string {
  const dim = DIMENSION_OPTIONS.find(d => d.value === dimension)
  if (!dim) return `${range.min}-${range.max}`

  if (dimension === 'loanAmount') {
    const formatAmount = (v: number) => {
      if (v >= 1000000) return `$${(v / 1000000).toFixed(2)}M`
      return `$${(v / 1000).toFixed(0)}K`
    }
    return `${formatAmount(range.min)} - ${formatAmount(range.max)}`
  }

  if (dimension === 'fico') {
    return `FICO ${range.min}-${range.max}`
  }

  if (dimension === 'ltv') {
    return `${range.min}%-${range.max}%`
  }

  return `${range.min} - ${range.max}`
}

interface RangeBuilderProps {
  dimension: DimensionType
  ranges: Range[]
  onChange: (ranges: Range[]) => void
}

function RangeBuilder({ dimension, ranges, onChange }: RangeBuilderProps) {
  const [autoFillStart, setAutoFillStart] = useState('')
  const [autoFillEnd, setAutoFillEnd] = useState('')
  const [autoFillStep, setAutoFillStep] = useState('')
  const [autoFillIncrement, setAutoFillIncrement] = useState('')

  const issues = useMemo(() => validateRanges(ranges), [ranges])

  const addRange = () => {
    const lastRange = ranges[ranges.length - 1]
    const newMin = lastRange ? lastRange.max + 1 : 0
    onChange([...ranges, { id: generateId(), min: newMin, max: newMin + 99 }])
  }

  const removeRange = (id: string) => {
    onChange(ranges.filter(r => r.id !== id))
  }

  const updateRange = (id: string, field: 'min' | 'max', value: number) => {
    onChange(ranges.map(r => r.id === id ? { ...r, [field]: value } : r))
  }

  const handleAutoFill = () => {
    const start = parseFloat(autoFillStart)
    const end = parseFloat(autoFillEnd)
    const increment = parseFloat(autoFillIncrement) || parseFloat(autoFillStep)

    if (isNaN(start) || isNaN(end) || isNaN(increment) || increment <= 0 || start >= end) {
      return
    }

    const newRanges: Range[] = []
    let current = start

    while (current < end) {
      const rangeEnd = Math.min(current + increment - 1, end)
      newRanges.push({
        id: generateId(),
        min: current,
        max: rangeEnd,
      })
      current = rangeEnd + 1
    }

    onChange(newRanges)
  }

  const dim = DIMENSION_OPTIONS.find(d => d.value === dimension)

  return (
    <div className="border rounded-lg bg-white overflow-hidden h-full flex flex-col">
      {/* Header - Centered and prominent */}
      <div className="bg-slate-100 border-b px-4 py-3">
        <h3 className="text-base font-semibold text-slate-800 text-center">
          {dim?.label} Ranges
        </h3>
        <p className="text-xs text-slate-500 text-center mt-1">
          Define the {dim?.label?.toLowerCase()} ranges for this dimension
        </p>
      </div>

      <div className="p-4 space-y-4 flex-1 flex flex-col min-h-0">
        {/* Auto-fill helper - contained section */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <Wand2 className="h-4 w-4 text-blue-600" />
            <span className="text-sm font-semibold text-blue-800">Auto-fill Ranges</span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-blue-700">Start Value</Label>
              <Input
                type="number"
                placeholder="e.g., 1"
                value={autoFillStart}
                onChange={(e) => setAutoFillStart(e.target.value)}
                className="h-10 w-full text-sm bg-white"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-blue-700">End Value</Label>
              <Input
                type="number"
                placeholder="e.g., 1000"
                value={autoFillEnd}
                onChange={(e) => setAutoFillEnd(e.target.value)}
                className="h-10 w-full text-sm bg-white"
              />
            </div>
            <div className="space-y-1.5 col-span-2">
              <Label className="text-xs font-medium text-blue-700">Increment (range size)</Label>
              <Input
                type="number"
                placeholder="e.g., 25 (creates ranges of 25)"
                value={autoFillIncrement}
                onChange={(e) => setAutoFillIncrement(e.target.value)}
                className="h-10 w-full text-sm bg-white"
              />
              <p className="text-xs text-blue-600">
                Example: Start=1, End=1000, Increment=25 creates ranges: 1-25, 26-50, 51-75, etc.
              </p>
            </div>
          </div>
          <Button size="sm" onClick={handleAutoFill} className="w-full mt-3 h-9 bg-blue-600 hover:bg-blue-700">
            Generate Ranges
          </Button>
        </div>

        {/* Range list - scrollable */}
        <div className="flex-1 min-h-0 overflow-y-auto space-y-2 pr-1">
          {ranges.map((range, index) => {
            const hasIssue = issues.some(i => i.indices.includes(index))
            return (
              <div
                key={range.id}
                className={cn(
                  'flex items-center gap-3 p-3 rounded-lg border',
                  hasIssue ? 'border-yellow-400 bg-yellow-50' : 'border-slate-200 bg-slate-50'
                )}
              >
                <span className="text-sm font-medium text-slate-600 w-8 shrink-0">#{index + 1}</span>
                <div className="flex items-center gap-2 flex-1">
                  <div className="flex-1">
                    <Label className="text-xs text-slate-500 mb-1 block">Min</Label>
                    <Input
                      type="number"
                      value={range.min}
                      onChange={(e) => updateRange(range.id, 'min', parseFloat(e.target.value) || 0)}
                      className="h-10 w-full text-sm font-mono"
                    />
                  </div>
                  <span className="text-slate-400 mt-5">to</span>
                  <div className="flex-1">
                    <Label className="text-xs text-slate-500 mb-1 block">Max</Label>
                    <Input
                      type="number"
                      value={range.max}
                      onChange={(e) => updateRange(range.id, 'max', parseFloat(e.target.value) || 0)}
                      className="h-10 w-full text-sm font-mono"
                    />
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-10 w-10 text-red-500 hover:text-red-600 hover:bg-red-50 mt-5 shrink-0"
                  onClick={() => removeRange(range.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            )
          })}

          {/* Add Range button at bottom of list */}
          <Button 
            variant="outline" 
            onClick={addRange} 
            className="w-full h-10 gap-2 border-dashed border-slate-300 text-slate-600 hover:bg-slate-50 hover:border-slate-400"
          >
            <Plus className="h-4 w-4" />
            Add Range
          </Button>
        </div>

        {/* Validation issues */}
        {issues.length > 0 && (
          <div className="space-y-1 shrink-0">
            {issues.map((issue, i) => (
              <div
                key={i}
                className={cn(
                  'flex items-center gap-2 text-xs p-2 rounded',
                  issue.type === 'gap' ? 'bg-yellow-50 text-yellow-700 border border-yellow-200' : 'bg-red-50 text-red-700 border border-red-200'
                )}
              >
                {issue.type === 'gap' ? (
                  <AlertTriangle className="h-3 w-3 shrink-0" />
                ) : (
                  <AlertCircle className="h-3 w-3 shrink-0" />
                )}
                {issue.message}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// List Builder component for 1D range-to-value mapping
interface ListBuilderProps {
  dimension: DimensionType
  ranges: RangeWithValue[]
  onChange: (ranges: RangeWithValue[]) => void
  valueType: CellValueType
}

function ListBuilder({ dimension, ranges, onChange, valueType }: ListBuilderProps) {
  const [autoFillStart, setAutoFillStart] = useState('')
  const [autoFillEnd, setAutoFillEnd] = useState('')
  const [autoFillIncrement, setAutoFillIncrement] = useState('')
  const [bulkValue, setBulkValue] = useState('')
  const [bulkIncrement, setBulkIncrement] = useState('')

  const issues = useMemo(() => validateRanges(ranges), [ranges])
  const dim = DIMENSION_OPTIONS.find(d => d.value === dimension)

  const addRange = () => {
    const lastRange = ranges[ranges.length - 1]
    const newMin = lastRange ? lastRange.max + 1 : 0
    onChange([...ranges, { id: generateId(), min: newMin, max: newMin + 99, value: '' }])
  }

  const removeRange = (id: string) => {
    onChange(ranges.filter(r => r.id !== id))
  }

  const updateRange = (id: string, field: 'min' | 'max' | 'value', value: number | string) => {
    onChange(ranges.map(r => r.id === id ? { ...r, [field]: value } : r))
  }

  const handleAutoFill = () => {
    const start = parseFloat(autoFillStart)
    const end = parseFloat(autoFillEnd)
    const increment = parseFloat(autoFillIncrement)

    if (isNaN(start) || isNaN(end) || isNaN(increment) || increment <= 0 || start >= end) {
      return
    }

    const newRanges: RangeWithValue[] = []
    let current = start

    while (current < end) {
      const rangeEnd = Math.min(current + increment - 1, end)
      newRanges.push({
        id: generateId(),
        min: current,
        max: rangeEnd,
        value: '',
      })
      current = rangeEnd + 1
    }

    onChange(newRanges)
  }

  const handleBulkFill = () => {
    if (!bulkValue) return
    const startValue = parseFloat(bulkValue)
    const increment = parseFloat(bulkIncrement) || 0
    
    if (isNaN(startValue)) return
    
    onChange(ranges.map((r, index) => ({ 
      ...r, 
      value: (startValue + (increment * index)).toFixed(3).replace(/\.?0+$/, '')
    })))
  }

  const getValueLabel = () => {
    switch (valueType) {
      case 'price': return 'Price'
      case 'fee': return 'Fee ($)'
      case 'margin': return 'Margin (%)'
      case 'disallow': return 'Disallow'
    }
  }

  const getValuePlaceholder = () => {
    switch (valueType) {
      case 'price': return '100.000'
      case 'fee': return '500.00'
      case 'margin': return '2.50'
      case 'disallow': return 'Yes/No'
    }
  }

  return (
    <div className="border rounded-lg bg-white overflow-hidden h-full flex flex-col">
      <div className="bg-slate-100 border-b px-4 py-3">
        <h3 className="text-base font-semibold text-slate-800 text-center">
          {dim?.label} Ranges with {getValueLabel()}
        </h3>
        <p className="text-xs text-slate-500 text-center mt-1">
          Define ranges and assign a {getValueLabel().toLowerCase()} to each
        </p>
      </div>

      <div className="p-4 space-y-4 flex-1 flex flex-col min-h-0">
        {/* Auto-fill ranges helper */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <Wand2 className="h-4 w-4 text-blue-600" />
            <span className="text-sm font-semibold text-blue-800">Auto-fill Ranges</span>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-blue-700">Start</Label>
              <Input
                type="number"
                placeholder="e.g., 100000"
                value={autoFillStart}
                onChange={(e) => setAutoFillStart(e.target.value)}
                className="h-9 text-sm bg-white"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-blue-700">End</Label>
              <Input
                type="number"
                placeholder="e.g., 1000000"
                value={autoFillEnd}
                onChange={(e) => setAutoFillEnd(e.target.value)}
                className="h-9 text-sm bg-white"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-blue-700">Increment</Label>
              <Input
                type="number"
                placeholder="e.g., 50000"
                value={autoFillIncrement}
                onChange={(e) => setAutoFillIncrement(e.target.value)}
                className="h-9 text-sm bg-white"
              />
            </div>
          </div>
          <Button size="sm" onClick={handleAutoFill} className="w-full mt-3 h-8 bg-blue-600 hover:bg-blue-700">
            Generate Ranges
          </Button>
        </div>

        {/* Bulk fill values */}
        {ranges.length > 0 && (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
            <div className="flex items-center gap-3 mb-2">
              <Wand2 className="h-4 w-4 text-gray-500" />
              <span className="text-sm font-semibold text-gray-700">Fill Values</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex-1 space-y-1">
                <Label className="text-xs text-gray-500">Starting Value</Label>
                <Input
                  type={valueType === 'disallow' ? 'text' : 'number'}
                  step={valueType === 'price' || valueType === 'margin' ? '0.001' : '0.01'}
                  placeholder={getValuePlaceholder()}
                  value={bulkValue}
                  onChange={(e) => setBulkValue(e.target.value)}
                  className="h-8 text-sm"
                />
              </div>
              <div className="w-32 space-y-1">
                <Label className="text-xs text-gray-500">Increment</Label>
                <Input
                  type="number"
                  step="0.001"
                  placeholder="e.g., 0.05"
                  value={bulkIncrement}
                  onChange={(e) => setBulkIncrement(e.target.value)}
                  className="h-8 text-sm"
                />
              </div>
              <div className="pt-5">
                <Button size="sm" variant="outline" onClick={handleBulkFill} className="h-8">
                  Apply
                </Button>
              </div>
            </div>
            {bulkValue && bulkIncrement && ranges.length > 0 && (
              <p className="text-xs text-gray-500 mt-2">
                Preview: {bulkValue}, {(parseFloat(bulkValue) + parseFloat(bulkIncrement)).toFixed(3).replace(/\.?0+$/, '')}, {(parseFloat(bulkValue) + parseFloat(bulkIncrement) * 2).toFixed(3).replace(/\.?0+$/, '')}...
              </p>
            )}
          </div>
        )}

        {/* Range list with values */}
        <div className="flex-1 min-h-0 overflow-y-auto space-y-2 pr-1">
          {/* Header row */}
          {ranges.length > 0 && (
            <div className="flex items-center gap-3 px-3 py-2 text-xs font-semibold text-gray-600 border-b">
              <span className="w-8">#</span>
              <span className="flex-1">Min</span>
              <span className="flex-1">Max</span>
              <span className="w-32">{getValueLabel()}</span>
              <span className="w-10"></span>
            </div>
          )}
          
          {ranges.map((range, index) => {
            const hasIssue = issues.some(i => i.indices.includes(index))
            return (
              <div
                key={range.id}
                className={cn(
                  'flex items-center gap-3 p-3 rounded-lg border',
                  hasIssue ? 'border-yellow-400 bg-yellow-50' : 'border-slate-200 bg-slate-50'
                )}
              >
                <span className="text-sm font-medium text-slate-600 w-8 shrink-0">#{index + 1}</span>
                <Input
                  type="number"
                  value={range.min}
                  onChange={(e) => updateRange(range.id, 'min', parseFloat(e.target.value) || 0)}
                  className="h-9 text-sm font-sans flex-1"
                />
                <Input
                  type="number"
                  value={range.max}
                  onChange={(e) => updateRange(range.id, 'max', parseFloat(e.target.value) || 0)}
                  className="h-9 text-sm font-sans flex-1"
                />
                <Input
                  type={valueType === 'disallow' ? 'text' : 'number'}
                  step={valueType === 'price' || valueType === 'margin' ? '0.001' : '0.01'}
                  value={range.value}
                  onChange={(e) => updateRange(range.id, 'value', e.target.value)}
                  placeholder={getValuePlaceholder()}
                  className="h-9 text-sm font-sans w-32 bg-blue-50 border-blue-200 focus:border-blue-400"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 text-red-500 hover:text-red-600 hover:bg-red-50 shrink-0"
                  onClick={() => removeRange(range.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            )
          })}

          <Button 
            variant="outline" 
            onClick={addRange} 
            className="w-full h-9 gap-2 border-dashed border-slate-300 text-slate-600 hover:bg-slate-50 hover:border-slate-400"
          >
            <Plus className="h-4 w-4" />
            Add Range
          </Button>
        </div>

        {/* Validation issues */}
        {issues.length > 0 && (
          <div className="space-y-1 shrink-0">
            {issues.map((issue, i) => (
              <div
                key={i}
                className={cn(
                  'flex items-center gap-2 text-xs p-2 rounded',
                  issue.type === 'gap' ? 'bg-yellow-50 text-yellow-700 border border-yellow-200' : 'bg-red-50 text-red-700 border border-red-200'
                )}
              >
                {issue.type === 'gap' ? (
                  <AlertTriangle className="h-3 w-3 shrink-0" />
                ) : (
                  <AlertCircle className="h-3 w-3 shrink-0" />
                )}
                {issue.message}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

interface MatrixGridProps {
  xRanges: Range[]
  yRanges: Range[]
  xDimension: DimensionType
  yDimension: DimensionType
  cellValues: Record<string, string>
  onCellChange: (key: string, value: string) => void
  cellValueType: CellValueType
  onUndo: () => void
  canUndo: boolean
  undoCount: number
}

function MatrixGrid({
  xRanges,
  yRanges,
  xDimension,
  yDimension,
  cellValues,
  onCellChange,
  cellValueType,
  onUndo,
  canUndo,
  undoCount,
}: MatrixGridProps) {
  const [fillValue, setFillValue] = useState('')
  const [selectedCells, setSelectedCells] = useState<Set<string>>(new Set())
  const [isSelecting, setIsSelecting] = useState(false)
  const [selectionStart, setSelectionStart] = useState<{ xIdx: number; yIdx: number } | null>(null)
  const [editingCell, setEditingCell] = useState<string | null>(null)
  const [showClearAllConfirm, setShowClearAllConfirm] = useState(false)

  const allCellKeys = useMemo(() => {
    const keys: string[] = []
    xRanges.forEach(xRange => {
      yRanges.forEach(yRange => {
        keys.push(`${xRange.id}-${yRange.id}`)
      })
    })
    return keys
  }, [xRanges, yRanges])

  const handleFillCells = () => {
    const cellsToFill = selectedCells.size > 0 ? selectedCells : new Set(allCellKeys)
    cellsToFill.forEach(key => {
      onCellChange(key, fillValue)
    })
  }

  const handleSelectAll = () => {
    setSelectedCells(new Set(allCellKeys))
  }

  const handleClearSelection = () => {
    setSelectedCells(new Set())
  }

  const handleClearAllValues = () => {
    allCellKeys.forEach(key => {
      onCellChange(key, '')
    })
    setShowClearAllConfirm(false)
  }

  const toggleCellSelection = (key: string, event: React.MouseEvent) => {
    event.preventDefault()
    setSelectedCells(prev => {
      const next = new Set(prev)
      if (event.ctrlKey || event.metaKey) {
        // Toggle individual cell with Ctrl/Cmd click
        if (next.has(key)) {
          next.delete(key)
        } else {
          next.add(key)
        }
      } else if (event.shiftKey && selectionStart) {
        // Range selection with Shift click
        const xIdx = xRanges.findIndex(x => key.startsWith(x.id))
        const yIdx = yRanges.findIndex(y => key.endsWith(y.id))
        const minX = Math.min(selectionStart.xIdx, xIdx)
        const maxX = Math.max(selectionStart.xIdx, xIdx)
        const minY = Math.min(selectionStart.yIdx, yIdx)
        const maxY = Math.max(selectionStart.yIdx, yIdx)
        
        for (let xi = minX; xi <= maxX; xi++) {
          for (let yi = minY; yi <= maxY; yi++) {
            const cellKey = `${xRanges[xi].id}-${yRanges[yi].id}`
            next.add(cellKey)
          }
        }
      } else {
        // Single click - start new selection
        next.clear()
        next.add(key)
      }
      return next
    })
    
    // Update selection start for shift-click range selection
    const xIdx = xRanges.findIndex(x => key.startsWith(x.id))
    const yIdx = yRanges.findIndex(y => key.endsWith(y.id))
    if (!event.shiftKey) {
      setSelectionStart({ xIdx, yIdx })
    }
  }

  const handleMouseDown = (key: string, xIdx: number, yIdx: number, event: React.MouseEvent) => {
    if (event.button !== 0) return // Only left click
    event.preventDefault()
    setIsSelecting(true)
    setSelectionStart({ xIdx, yIdx })
    
    if (!event.ctrlKey && !event.metaKey && !event.shiftKey) {
      setSelectedCells(new Set([key]))
    } else if (event.ctrlKey || event.metaKey) {
      setSelectedCells(prev => {
        const next = new Set(prev)
        if (next.has(key)) {
          next.delete(key)
        } else {
          next.add(key)
        }
        return next
      })
    }
  }

  const handleMouseEnter = (key: string, xIdx: number, yIdx: number) => {
    if (!isSelecting || !selectionStart) return
    
    const minX = Math.min(selectionStart.xIdx, xIdx)
    const maxX = Math.max(selectionStart.xIdx, xIdx)
    const minY = Math.min(selectionStart.yIdx, yIdx)
    const maxY = Math.max(selectionStart.yIdx, yIdx)
    
    const newSelection = new Set<string>()
    for (let xi = minX; xi <= maxX; xi++) {
      for (let yi = minY; yi <= maxY; yi++) {
        const cellKey = `${xRanges[xi].id}-${yRanges[yi].id}`
        newSelection.add(cellKey)
      }
    }
    setSelectedCells(newSelection)
  }

  const handleMouseUp = () => {
    setIsSelecting(false)
  }

  // Add global mouse up listener to handle mouse up outside the table
  useMemo(() => {
    if (typeof window !== 'undefined') {
      const handleGlobalMouseUp = () => setIsSelecting(false)
      window.addEventListener('mouseup', handleGlobalMouseUp)
      return () => window.removeEventListener('mouseup', handleGlobalMouseUp)
    }
  }, [])



  if (xRanges.length === 0 || yRanges.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-gray-500 border rounded-lg">
        Add ranges to both dimensions to see the matrix
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {/* Fill cells helper */}
      <div className="bg-slate-50 border rounded-lg p-3 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Label className="text-sm font-medium text-slate-700">Fill selected cells with:</Label>
            <Input
              type={cellValueType === 'disallow' ? 'text' : 'number'}
              step={cellValueType === 'price' || cellValueType === 'margin' ? '0.001' : '0.01'}
              value={fillValue}
              onChange={(e) => setFillValue(e.target.value)}
              className="h-9 w-32"
              placeholder={cellValueType === 'disallow' ? 'Yes/No' : '0.000'}
            />
            <Button size="sm" onClick={handleFillCells} className="h-9">
              {selectedCells.size > 0 ? `Fill ${selectedCells.size} Selected` : 'Fill All Cells'}
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={handleSelectAll} className="h-9">
              Select All
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={onUndo}
              disabled={!canUndo}
              className={cn(
                'h-9 gap-1.5',
                canUndo ? 'text-blue-600 border-blue-300 hover:bg-blue-50 hover:border-blue-400' : 'text-gray-400'
              )}
              title="Undo last change (Cmd/Ctrl+Z)"
            >
              <Undo2 className="h-3.5 w-3.5" />
              Undo
            </Button>
            <Button 
              size="sm" 
              variant="outline" 
              onClick={() => setShowClearAllConfirm(true)} 
              className="h-9 text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300"
            >
              Clear All Values
            </Button>
            {selectedCells.size > 0 && (
              <Button size="sm" variant="ghost" onClick={handleClearSelection} className="h-9">
                Clear Selection ({selectedCells.size})
              </Button>
            )}
          </div>
        </div>
        <p className="text-xs text-slate-500">
          Click a cell to edit its value directly. Use Tab to move between cells. Ctrl/Cmd+click to multi-select, drag to select a range.
        </p>
      </div>

      {/* Matrix table */}
      <div className="overflow-auto border rounded-lg" onMouseUp={handleMouseUp}>
        <table className="w-full border-collapse select-none">
          <thead>
            <tr className="bg-gray-100">
              <th className="border p-2 text-xs font-semibold text-gray-700 min-w-[120px]">
                {DIMENSION_OPTIONS.find(d => d.value === xDimension)?.label} /
                {DIMENSION_OPTIONS.find(d => d.value === yDimension)?.label}
              </th>
              {yRanges.map((yRange) => (
                <th key={yRange.id} className="border p-2 text-xs font-medium text-gray-600 min-w-[125px]">
                  {formatRangeLabel(yRange, yDimension)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {xRanges.map((xRange, xIdx) => (
              <tr key={xRange.id}>
                <td className="border p-2 text-xs font-medium text-gray-700 bg-gray-50">
                  {formatRangeLabel(xRange, xDimension)}
                </td>
                {yRanges.map((yRange, yIdx) => {
                  const key = `${xRange.id}-${yRange.id}`
                  const isSelected = selectedCells.has(key)
                  const isEditing = editingCell === key
                  return (
                    <td 
                      key={key} 
                      className={cn(
                        'border p-1 transition-colors',
                        isEditing ? 'bg-white' : 'cursor-pointer',
                        isSelected && !isEditing && 'bg-blue-100 ring-2 ring-inset ring-blue-500'
                      )}
                      onMouseDown={(e) => {
                        if (isEditing) return
                        handleMouseDown(key, xIdx, yIdx, e)
                      }}
                      onMouseEnter={() => {
                        if (isEditing) return
                        handleMouseEnter(key, xIdx, yIdx)
                      }}
                      onClick={() => {
                        if (!isSelecting) {
                          setEditingCell(key)
                          // Focus the input after setting editing cell
                          setTimeout(() => {
                            const input = document.querySelector(`input[data-cell-key="${key}"]`) as HTMLInputElement
                            input?.focus()
                            input?.select()
                          }, 0)
                        }
                      }}
                    >
                      <Input
                        type={cellValueType === 'disallow' ? 'text' : 'number'}
                        step={cellValueType === 'price' || cellValueType === 'margin' ? '0.001' : '0.01'}
                        value={cellValues[key] || ''}
                        onChange={(e) => onCellChange(key, e.target.value)}
                        className={cn(
                          'h-8 w-full min-w-[115px] text-center text-sm font-mono',
                          isEditing 
                            ? 'ring-2 ring-blue-500 border-blue-500' 
                            : 'pointer-events-none',
                          isSelected && !isEditing && 'bg-blue-50 border-blue-300'
                        )}
                        placeholder={cellValueType === 'disallow' ? '-' : '0'}
                        onFocus={() => setEditingCell(key)}
                        onBlur={() => setEditingCell(null)}
                        onKeyDown={(e) => {
                          e.stopPropagation()
                          if (e.key === 'Enter' || e.key === 'Escape') {
                            setEditingCell(null)
                            ;(e.target as HTMLInputElement).blur()
                          }
                          if (e.key === 'Tab') {
                            // Tab moves to next cell in reading order (left-to-right, top-to-bottom)
                            e.preventDefault()
                            // Build ordered array: row by row, column by column
                            const orderedKeys: string[] = []
                            xRanges.forEach((xRange) => {
                              yRanges.forEach((yRange) => {
                                orderedKeys.push(`${xRange.id}-${yRange.id}`)
                              })
                            })
                            const currentIdx = orderedKeys.indexOf(key)
                            const nextIdx = e.shiftKey 
                              ? (currentIdx - 1 + orderedKeys.length) % orderedKeys.length
                              : (currentIdx + 1) % orderedKeys.length
                            const nextKey = orderedKeys[nextIdx]
                            setEditingCell(nextKey)
                            // Focus the next input after state update
                            setTimeout(() => {
                              const nextInput = document.querySelector(`input[data-cell-key="${nextKey}"]`) as HTMLInputElement
                              nextInput?.focus()
                              nextInput?.select()
                            }, 0)
                          }
                        }}
                        onMouseDown={(e) => {
                          if (isEditing) {
                            e.stopPropagation()
                          }
                        }}
                        onClick={(e) => {
                          e.stopPropagation()
                          setEditingCell(key)
                        }}
                        data-cell-key={key}
                      />
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Clear All Values Confirmation Dialog */}
      <AlertDialog open={showClearAllConfirm} onOpenChange={setShowClearAllConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear All Values?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove all values from every cell in the matrix. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleClearAllValues} 
              className="bg-red-600 hover:bg-red-700"
            >
              Clear All Values
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

export function RuleBuilderDialog({ open, onOpenChange, editingRuleSetId }: RuleBuilderDialogProps) {
  const { stageCreate, getRulesInSet, stageUpdateMany, stageCreateMany } = usePricingRules()
  const isEditMode = Boolean(editingRuleSetId)
  const [currentStep, setCurrentStep] = useState(isEditMode ? 'dimensions' : 'mode')
  
  // Builder mode: matrix (2D) or list (1D)
  const [builderMode, setBuilderMode] = useState<BuilderMode>('matrix')
  const [showModeChangeWarning, setShowModeChangeWarning] = useState(false)
  const [pendingMode, setPendingMode] = useState<BuilderMode | null>(null)

  const handleModeChange = (newMode: BuilderMode) => {
    if (newMode === builderMode) return
    setPendingMode(newMode)
    setShowModeChangeWarning(true)
  }

  const confirmModeChange = () => {
    if (pendingMode) {
      setBuilderMode(pendingMode)
      setCurrentStep('mode')
    }
    setShowModeChangeWarning(false)
    setPendingMode(null)
    clearUndoHistory()
  }

  const cancelModeChange = () => {
    setShowModeChangeWarning(false)
    setPendingMode(null)
  }

  // Rule Set name (required for Mode A create, prefilled for Mode B edit)
  const [ruleSetName, setRuleSetName] = useState('')

  // Step 1: Dimensions & Base Rule
  const [xDimension, setXDimension] = useState<DimensionType>('loanAmount')
  const [yDimension, setYDimension] = useState<DimensionType>('fico')
  const [listDimension, setListDimension] = useState<DimensionType>('loanAmount')
  const [descriptionPrefix, setDescriptionPrefix] = useState('Conv 30yr')
  const [disallow, setDisallow] = useState(false)
  
  // Step 1 - Apply these rules
  const [lockPeriod, setLockPeriod] = useState<number | null>(null)
  const [feeSet, setFeeSet] = useState<string>('')
  const [miCompany, setMiCompany] = useState<string>('')
  const [price, setPrice] = useState<string>('')
  const [rate, setRate] = useState<string>('')
  const [fees, setFees] = useState<string>('')
  const [marginType, setMarginType] = useState<'percentage' | 'flat'>('percentage')
  const [compFlatFee, setCompFlatFee] = useState<string>('')
  const [finalPriceMin, setFinalPriceMin] = useState<string>('')
  const [finalPriceMax, setFinalPriceMax] = useState<string>('')
  const [hasSecondMortgage, setHasSecondMortgage] = useState(false)
  const [ignoreNonEighthRates, setIgnoreNonEighthRates] = useState(false)
  const [includeUFMIP, setIncludeUFMIP] = useState(false)
  const [maxCashBack, setMaxCashBack] = useState<string>('')
  const [financeUFMIP, setFinanceUFMIP] = useState(false)
  
  // Step 2 - Optional criteria
  const [selectedPropertyTypes, setSelectedPropertyTypes] = useState<string[]>([])
  const [selectedPropertyUsage, setSelectedPropertyUsage] = useState<string[]>([])
  const [selectedLoanTypes, setSelectedLoanTypes] = useState<string[]>([])
  const [selectedQuotingChannels, setSelectedQuotingChannels] = useState<string[]>([])
  const [selectedLockPeriods, setSelectedLockPeriods] = useState<number[]>([])
  const [selectedBorrowerFilters, setSelectedBorrowerFilters] = useState<string[]>([])
  const [selectedPointGroups, setSelectedPointGroups] = useState<string[]>([])
  const [selectedStates, setSelectedStates] = useState<string[]>([])
  const [statesSearchTerm, setStatesSearchTerm] = useState('')
  
  // Step 3 - Program filters
  const [selectedLenders, setSelectedLenders] = useState<string[]>([])
  const [selectedProductFamilies, setSelectedProductFamilies] = useState<string[]>([])
  const [selectedProductClasses, setSelectedProductClasses] = useState<string[]>([])
  const [selectedProductTypes, setSelectedProductTypes] = useState<string[]>([])
  const [selectedProductTerms, setSelectedProductTerms] = useState<string[]>([])
  
  // Step 4 - Schedule
  const [startDate, setStartDate] = useState<string>('')
  const [endDate, setEndDate] = useState<string>('')
  const [startTime, setStartTime] = useState<string>('')
  const [endTime, setEndTime] = useState<string>('')
  const [selectedDays, setSelectedDays] = useState<string[]>([])
  
  // Visibility
  const [hideInQuoteAdjustments, setHideInQuoteAdjustments] = useState(false)

  // Optional filters expanded state
  const [showOptionalFilters, setShowOptionalFilters] = useState(false)

  // Step 2: Ranges (Matrix mode)
  const [xRanges, setXRanges] = useState<Range[]>([
    { id: generateId(), min: 100000, max: 249999 },
    { id: generateId(), min: 250000, max: 499999 },
    { id: generateId(), min: 500000, max: 749999 },
    { id: generateId(), min: 750000, max: 1000000 },
  ])
  const [yRanges, setYRanges] = useState<Range[]>([
    { id: generateId(), min: 620, max: 679 },
    { id: generateId(), min: 680, max: 719 },
    { id: generateId(), min: 720, max: 759 },
    { id: generateId(), min: 760, max: 850 },
  ])
  
  // List mode ranges with values
  const [listRanges, setListRanges] = useState<RangeWithValue[]>([
    { id: generateId(), min: 100000, max: 249999, value: '' },
    { id: generateId(), min: 250000, max: 499999, value: '' },
    { id: generateId(), min: 500000, max: 749999, value: '' },
    { id: generateId(), min: 750000, max: 1000000, value: '' },
  ])

  // Step 3: Matrix values (only for matrix mode)
  const [cellValueType, setCellValueType] = useState<CellValueType>('margin')
  const [cellValues, setCellValues] = useState<Record<string, string>>({})

  // Refs to always hold the latest values without causing dep-loop re-renders
  const cellValuesRef = useRef<Record<string, string>>({})
  const listRangesRef = useRef<RangeWithValue[]>(listRanges)

  // Keep refs in sync on every render (no useEffect needed — runs synchronously)
  cellValuesRef.current = cellValues
  listRangesRef.current = listRanges

  // Undo history — snapshots of { cellValues, listRanges } before each mutation
  interface UndoSnapshot { cellValues: Record<string, string>; listRanges: RangeWithValue[] }
  const undoStackRef = useRef<UndoSnapshot[]>([])
  const [canUndo, setCanUndo] = useState(false)

  // Push current state onto the undo stack before a mutation
  const pushUndo = useCallback(() => {
    undoStackRef.current = [
      ...undoStackRef.current.slice(-49), // cap at 50 snapshots
      {
        cellValues: { ...cellValuesRef.current },
        listRanges: listRangesRef.current.map(r => ({ ...r })),
      },
    ]
    setCanUndo(true)
  }, [])

  const handleUndo = useCallback(() => {
    if (undoStackRef.current.length === 0) return
    const snapshot = undoStackRef.current[undoStackRef.current.length - 1]
    undoStackRef.current = undoStackRef.current.slice(0, -1)
    setCellValues(snapshot.cellValues)
    setListRanges(snapshot.listRanges)
    setCanUndo(undoStackRef.current.length > 0)
  }, [])

  // Clear undo history when dialog closes or mode changes
  const clearUndoHistory = useCallback(() => {
    undoStackRef.current = []
    setCanUndo(false)
  }, [])

  // Preview state
  const [previewExpanded, setPreviewExpanded] = useState<string | null>(null)

  // Rule set edit summary modal
  const [showSummaryModal, setShowSummaryModal] = useState(false)
  const [pendingDiffs, setPendingDiffs] = useState<RuleSetEditDiff[]>([])

  // Keyboard shortcut: Cmd/Ctrl+Z to undo (only when dialog is open)
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault()
        handleUndo()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, handleUndo])

  // Mode B: pre-populate state from the rule set being edited
  const existingRulesRef = useRef<PricingRule[]>([])
  useEffect(() => {
    if (editingRuleSetId && open) {
      const existingRules = getRulesInSet(editingRuleSetId)
      existingRulesRef.current = existingRules
      if (existingRules.length === 0) return

      const first = existingRules[0]

      // ── Name / prefix ──────────────────────────────────────────────
      setRuleSetName(first.RuleSetName || editingRuleSetId)
      const parts = first.RuleDescription.split('|')
      setDescriptionPrefix(parts[0]?.trim() || first.RuleDescription)

      // ── Options from first rule ────────────────────────────────────
      if (first.FeeSet) setFeeSet(first.FeeSet)
      if (first.MICompany) setMiCompany(first.MICompany)
      if (first.Rate) setRate(first.Rate)
      if (first.MarginType) setMarginType(first.MarginType)
      setDisallow(first.Disallow)
      setHasSecondMortgage(first.HasSecondMortgage)
      setIgnoreNonEighthRates(first.IgnoreNonEighthRates)
      setIncludeUFMIP(first.IncludeUFMIP)
      setFinanceUFMIP(first.FinanceUFMIP)
      setHideInQuoteAdjustments(first.HideInQuoteAdjustments)
      if (first.Lenders.length > 0) setSelectedLenders(first.Lenders)
      if (first.PropertyTypes.length > 0) setSelectedPropertyTypes(first.PropertyTypes)
      if (first.PropertyUsage.length > 0) setSelectedPropertyUsage(first.PropertyUsage)
      if (first.LoanTypes.length > 0) setSelectedLoanTypes(first.LoanTypes)
      if (first.QuotingChannels.length > 0) setSelectedQuotingChannels(first.QuotingChannels)
      if (first.States.length > 0) setSelectedStates(first.States)
      if (first.ProductFamilies.length > 0) setSelectedProductFamilies(first.ProductFamilies)
      if (first.ProductClasses.length > 0) setSelectedProductClasses(first.ProductClasses)
      if (first.ProductTypes.length > 0) setSelectedProductTypes(first.ProductTypes)
      if (first.ProductTerms.length > 0) setSelectedProductTerms(first.ProductTerms)

      // ── Detect cell value type ─────────────────────────────────────
      // Use whichever numeric field is non-zero on the first rule
      let detectedValueType: CellValueType = 'margin'
      if (first.Price !== 0) detectedValueType = 'price'
      else if (first.Fee !== 0) detectedValueType = 'fee'
      else if (first.Disallow) detectedValueType = 'disallow'
      setCellValueType(detectedValueType)

      const getValue = (r: PricingRule): string => {
        if (detectedValueType === 'price') return String(r.Price)
        if (detectedValueType === 'fee') return String(r.Fee)
        if (detectedValueType === 'disallow') return r.Disallow ? 'Yes' : 'No'
        return String(r.CompPercent)
      }

      // ── Detect builder mode: matrix = 2 pipe-separated dimension segments ──
      const isMatrix = parts.length >= 3

      if (isMatrix) {
        // ── Matrix mode: reconstruct X ranges, Y ranges, and cell values ──
        setBuilderMode('matrix')

        // Detect X and Y dimensions from the first rule
        // X = the dimension that varies across columns (first segment after prefix)
        // We infer from which numeric field changes between rules at the same Y
        // Simpler: detect from field presence: if FICO varies → fico, LTV → ltv, else loanAmount
        const ficosX = new Set(existingRules.map(r => `${r.FICOMin}-${r.FICOMax}`))
        const ltvsX = new Set(existingRules.map(r => `${r.LTVMin}-${r.LTVMax}`))
        const loansX = new Set(existingRules.map(r => `${r.LoanAmountMin}-${r.LoanAmountMax}`))

        // The dimension with more unique values is more likely X; use description parse as tiebreak
        // Parse actual range bounds from the stored rules directly — more reliable
        // Group rules by their Y-axis value to detect X dimension
        // Strategy: collect unique values per candidate field; the one with sqrt(n) unique values each = axis
        const nRules = existingRules.length
        const nFico = ficosX.size
        const nLtv = ltvsX.size
        const nLoan = loansX.size

        // Detect X and Y dimensions by checking which pairs of fields produce a grid
        // The X dimension is the one whose unique count = sqrt(n) or n/yCount
        // Simplest: check FICO vs LTV vs Loan for both axes using description label parsing
        const firstXLabel = parts[1]?.trim() || ''
        const firstYLabel = parts[2]?.trim() || ''

        const inferDim = (label: string): DimensionType => {
          const l = label.toLowerCase()
          if (l.includes('fico') || l.includes('credit')) return 'fico'
          if (l.includes('ltv') || l.includes('%')) return 'ltv'
          return 'loanAmount'
        }

        const xDim = inferDim(firstXLabel)
        const yDim = inferDim(firstYLabel)
        setXDimension(xDim)
        setYDimension(yDim)

        // Collect unique X and Y range bounds in insertion order
        const xRangeMap = new Map<string, { min: number; max: number }>()
        const yRangeMap = new Map<string, { min: number; max: number }>()

        const getXBounds = (r: PricingRule) => {
          if (xDim === 'fico') return { min: r.FICOMin, max: r.FICOMax }
          if (xDim === 'ltv') return { min: r.LTVMin, max: r.LTVMax }
          return { min: r.LoanAmountMin, max: r.LoanAmountMax }
        }
        const getYBounds = (r: PricingRule) => {
          if (yDim === 'fico') return { min: r.FICOMin, max: r.FICOMax }
          if (yDim === 'ltv') return { min: r.LTVMin, max: r.LTVMax }
          return { min: r.LoanAmountMin, max: r.LoanAmountMax }
        }

        existingRules.forEach(r => {
          const xb = getXBounds(r)
          const yb = getYBounds(r)
          xRangeMap.set(`${xb.min}-${xb.max}`, xb)
          yRangeMap.set(`${yb.min}-${yb.max}`, yb)
        })

        // Build Range objects with stable IDs
        const newXRanges: Range[] = Array.from(xRangeMap.values()).map(b => ({
          id: generateId(),
          min: b.min,
          max: b.max,
        }))
        const newYRanges: Range[] = Array.from(yRangeMap.values()).map(b => ({
          id: generateId(),
          min: b.min,
          max: b.max,
        }))

        setXRanges(newXRanges)
        setYRanges(newYRanges)

        // Build cell values map: key = xRange.id + '-' + yRange.id
        const newCellValues: Record<string, string> = {}
        existingRules.forEach(r => {
          const xb = getXBounds(r)
          const yb = getYBounds(r)
          const xR = newXRanges.find(rx => rx.min === xb.min && rx.max === xb.max)
          const yR = newYRanges.find(ry => ry.min === yb.min && ry.max === yb.max)
          if (xR && yR) {
            newCellValues[`${xR.id}-${yR.id}`] = getValue(r)
          }
        })
        setCellValues(newCellValues)
        clearUndoHistory()

      } else {
        // ── List mode: reconstruct list ranges with values ─────────────
        setBuilderMode('list')

        // Detect the list dimension from the first rule
        let listDim: DimensionType = 'loanAmount'
        if (first.FICOMin !== 0 || first.FICOMax !== 0) listDim = 'fico'
        else if (first.LTVMin !== 0 || first.LTVMax !== 0) listDim = 'ltv'
        setListDimension(listDim)

        const getBounds = (r: PricingRule) => {
          if (listDim === 'fico') return { min: r.FICOMin, max: r.FICOMax }
          if (listDim === 'ltv') return { min: r.LTVMin, max: r.LTVMax }
          return { min: r.LoanAmountMin, max: r.LoanAmountMax }
        }

        const newListRanges: RangeWithValue[] = existingRules.map(r => {
          const bounds = getBounds(r)
          return { id: generateId(), min: bounds.min, max: bounds.max, value: getValue(r) }
        })
        setListRanges(newListRanges)
        clearUndoHistory()
      }

      setCurrentStep('dimensions')
    } else if (!open) {
      existingRulesRef.current = []
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editingRuleSetId, open])

  const handleCellChange = useCallback((key: string, value: string) => {
    pushUndo()
    setCellValues(prev => ({ ...prev, [key]: value }))
  }, [pushUndo])

  const handleListRangesChange = useCallback((updater: RangeWithValue[] | ((prev: RangeWithValue[]) => RangeWithValue[])) => {
    pushUndo()
    setListRanges(prev => typeof updater === 'function' ? updater(prev) : updater)
  }, [pushUndo])

  // Apply all options to a rule
  const applyOptionsToRule = useCallback((rule: PricingRule) => {
    // Rule settings
    if (lockPeriod) rule.LockPeriod = lockPeriod
    if (feeSet) rule.FeeSet = feeSet
    if (miCompany) rule.MICompany = miCompany
    if (price) rule.Price = parseFloat(price) || 0
    if (rate) rule.Rate = rate
    if (fees) rule.Fee = parseFloat(fees) || 0
    rule.MarginType = marginType
    if (compFlatFee) rule.CompFlatFee = parseFloat(compFlatFee) || 0
    if (finalPriceMin) rule.FinalPriceMin = parseFloat(finalPriceMin) || 0
    if (finalPriceMax) rule.FinalPriceMax = parseFloat(finalPriceMax) || 0
    rule.HasSecondMortgage = hasSecondMortgage
    rule.IgnoreNonEighthRates = ignoreNonEighthRates
    rule.IncludeUFMIP = includeUFMIP
    if (maxCashBack) rule.MaxCashBack = parseFloat(maxCashBack) || 0
    rule.FinanceUFMIP = financeUFMIP

    // Optional criteria
    if (selectedPropertyTypes.length > 0) rule.PropertyTypes = selectedPropertyTypes
    if (selectedPropertyUsage.length > 0) rule.PropertyUsage = selectedPropertyUsage
    if (selectedLoanTypes.length > 0) rule.LoanTypes = selectedLoanTypes
    if (selectedQuotingChannels.length > 0) rule.QuotingChannels = selectedQuotingChannels
    if (selectedLockPeriods.length > 0) rule.LockPeriods = selectedLockPeriods
    if (selectedBorrowerFilters.length > 0) rule.BorrowerFilters = selectedBorrowerFilters
    if (selectedPointGroups.length > 0) rule.PointGroups = selectedPointGroups
    if (selectedStates.length > 0) rule.States = selectedStates

    // Program filters
    if (selectedLenders.length > 0) rule.Lenders = selectedLenders
    if (selectedProductFamilies.length > 0) rule.ProductFamilies = selectedProductFamilies
    if (selectedProductClasses.length > 0) rule.ProductClasses = selectedProductClasses
    if (selectedProductTypes.length > 0) rule.ProductTypes = selectedProductTypes
    if (selectedProductTerms.length > 0) rule.ProductTerms = selectedProductTerms

    // Schedule
    if (startDate) rule.StartDate = startDate
    if (endDate) rule.EndDate = endDate
    if (startTime) rule.StartTime = startTime
    if (endTime) rule.EndTime = endTime

    // Visibility
    rule.HideInQuoteAdjustments = hideInQuoteAdjustments

    return rule
  }, [
    lockPeriod, feeSet, miCompany, price, rate, fees, marginType, compFlatFee, finalPriceMin, finalPriceMax,
    hasSecondMortgage, ignoreNonEighthRates, includeUFMIP, maxCashBack, financeUFMIP,
    selectedPropertyTypes, selectedPropertyUsage, selectedLoanTypes, selectedQuotingChannels, selectedLockPeriods,
    selectedBorrowerFilters, selectedPointGroups, selectedStates, selectedLenders, selectedProductFamilies,
    selectedProductClasses, selectedProductTypes, selectedProductTerms, startDate, endDate, startTime, endTime,
    hideInQuoteAdjustments
  ])

  // Generate preview rules
  const previewRules = useMemo(() => {
    const rules: Array<{
      description: string
      xRange?: Range
      yRange?: Range
      listRange?: RangeWithValue
      cellValue: string
      rule: PricingRule
    }> = []

    let tempId = -Date.now()

    if (builderMode === 'list') {
      // List mode: one rule per range
      listRanges.forEach(range => {
        const rangeLabel = formatRangeLabel(range, listDimension)
        const description = `${descriptionPrefix} | ${rangeLabel}`
        const cellValue = range.value || '0'

        const rule = createBlankRule(tempId--)
        rule.RuleDescription = description
        rule.Disallow = disallow || (cellValueType === 'disallow' && cellValue.toLowerCase() === 'yes')

        // Set dimension values based on list dimension
        if (listDimension === 'loanAmount') {
          rule.LoanAmountMin = range.min
          rule.LoanAmountMax = range.max
        } else if (listDimension === 'fico') {
          rule.FICOMin = range.min
          rule.FICOMax = range.max
        } else if (listDimension === 'ltv') {
          rule.LTVMin = range.min
          rule.LTVMax = range.max
        }

        // Set value
        const numValue = parseFloat(cellValue) || 0
        if (cellValueType === 'price') {
          rule.Price = numValue
        } else if (cellValueType === 'fee') {
          rule.Fee = numValue
        } else if (cellValueType === 'margin') {
          rule.CompPercent = numValue
        }

        // Apply all options
        applyOptionsToRule(rule)

        rules.push({
          description,
          listRange: range,
          cellValue,
          rule,
        })
      })
    } else {
      // Matrix mode: one rule per cell
      xRanges.forEach(xRange => {
        yRanges.forEach(yRange => {
          const key = `${xRange.id}-${yRange.id}`
          const cellValue = cellValues[key] || '0'
          const xLabel = formatRangeLabel(xRange, xDimension)
          const yLabel = formatRangeLabel(yRange, yDimension)
          const description = `${descriptionPrefix} | ${xLabel} | ${yLabel}`

          const rule = createBlankRule(tempId--)
          rule.RuleDescription = description
          rule.Disallow = disallow || (cellValueType === 'disallow' && cellValue.toLowerCase() === 'yes')

          // Set dimension values
          if (xDimension === 'loanAmount') {
            rule.LoanAmountMin = xRange.min
            rule.LoanAmountMax = xRange.max
          } else if (xDimension === 'fico') {
            rule.FICOMin = xRange.min
            rule.FICOMax = xRange.max
          } else if (xDimension === 'ltv') {
            rule.LTVMin = xRange.min
            rule.LTVMax = xRange.max
          }

          if (yDimension === 'loanAmount') {
            rule.LoanAmountMin = yRange.min
            rule.LoanAmountMax = yRange.max
          } else if (yDimension === 'fico') {
            rule.FICOMin = yRange.min
            rule.FICOMax = yRange.max
          } else if (yDimension === 'ltv') {
            rule.LTVMin = yRange.min
            rule.LTVMax = yRange.max
          }

          // Set cell value
          const numValue = parseFloat(cellValue) || 0
          if (cellValueType === 'price') {
            rule.Price = numValue
          } else if (cellValueType === 'fee') {
            rule.Fee = numValue
          } else if (cellValueType === 'margin') {
            rule.CompPercent = numValue
          }

          // Apply all options
          applyOptionsToRule(rule)

          rules.push({
            description,
            xRange,
            yRange,
            cellValue,
            rule,
          })
        })
      })
    }

    return rules
  }, [builderMode, listRanges, listDimension, xRanges, yRanges, xDimension, yDimension, cellValues, cellValueType, descriptionPrefix, disallow, applyOptionsToRule])

  // Performs the actual staging after confirmation (Mode A or B)
  const executeStage = (diffs: RuleSetEditDiff[]) => {
    if (isEditMode && editingRuleSetId) {
      const updates: Array<{ rule: PricingRule; updates: Partial<PricingRule> }> = []
      const creates: PricingRule[] = []
      diffs.forEach(diff => {
        if (diff.isNew) {
          creates.push(diff.updatedRule)
        } else {
          updates.push({ rule: diff.rule, updates: diff.updatedRule })
        }
      })
      if (updates.length > 0) stageUpdateMany(updates)
      if (creates.length > 0) stageCreateMany(creates)
    } else {
      const setId = generateRuleSetId()
      previewRules.forEach(({ rule }) => {
        stageCreate({
          ...rule,
          RuleSetId: setId,
          RuleSetName: ruleSetName || setId,
        })
      })
    }
    onOpenChange(false)
    // Reset step to first step for next open
    setCurrentStep(isEditMode ? 'dimensions' : 'mode')
    setCellValues({})
    clearUndoHistory()
  }

  const handleStageAll = () => {
    if (isEditMode && editingRuleSetId) {
      // Mode B: compute diffs, show confirmation modal
      const existingRules = existingRulesRef.current
      const diffs: RuleSetEditDiff[] = []

      previewRules.forEach(({ rule: previewRule }, idx) => {
        const stamped: PricingRule = {
          ...previewRule,
          RuleSetId: editingRuleSetId,
          RuleSetName: ruleSetName || editingRuleSetId,
        }
        const existing = existingRules[idx]
        if (existing) {
          const changedFields = getChangedFields(existing, { ...existing, ...stamped })
          diffs.push({ rule: existing, updatedRule: stamped, isNew: false, changedFields })
        } else {
          diffs.push({ rule: stamped, updatedRule: stamped, isNew: true, changedFields: Object.keys(stamped) })
        }
      })

      setPendingDiffs(diffs)
      setShowSummaryModal(true)
    } else {
      // Mode A: no confirmation needed, stage immediately
      executeStage([])
    }
  }

  const toggleLender = (lender: string) => {
    if (selectedLenders.includes(lender)) {
      setSelectedLenders(prev => prev.filter(l => l !== lender))
    } else {
      setSelectedLenders(prev => [...prev, lender])
    }
  }

  // Generic toggle helper
  const createToggle = <T,>(setter: React.Dispatch<React.SetStateAction<T[]>>) => (item: T) => {
    setter(prev => prev.includes(item) ? prev.filter(i => i !== item) : [...prev, item])
  }

  const togglePropertyType = createToggle(setSelectedPropertyTypes)
  const togglePropertyUsage = createToggle(setSelectedPropertyUsage)
  const toggleLoanType = createToggle(setSelectedLoanTypes)
  const toggleQuotingChannel = createToggle(setSelectedQuotingChannels)
  const toggleLockPeriod = createToggle(setSelectedLockPeriods)
  const toggleBorrowerFilter = createToggle(setSelectedBorrowerFilters)
  const togglePointGroup = createToggle(setSelectedPointGroups)
  const toggleState = createToggle(setSelectedStates)
  const toggleProductFamily = createToggle(setSelectedProductFamilies)
  const toggleProductClass = createToggle(setSelectedProductClasses)
  const toggleProductType = createToggle(setSelectedProductTypes)
  const toggleProductTerm = createToggle(setSelectedProductTerms)
  const toggleDay = createToggle(setSelectedDays)

  const filteredStates = STATES.filter(state => 
    state.toLowerCase().includes(statesSearchTerm.toLowerCase())
  )

  // Get steps based on builder mode
  const getSteps = () => {
    if (isEditMode) {
      // Mode B skips the mode-selection step
      if (builderMode === 'list') {
        return ['dimensions', 'values', 'options', 'review']
      }
      return ['dimensions', 'ranges', 'matrix', 'options', 'review']
    }
    if (builderMode === 'list') {
      return ['mode', 'dimensions', 'values', 'options', 'review']
    }
    return ['mode', 'dimensions', 'ranges', 'matrix', 'options', 'review']
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="!max-w-[95vw] !w-[95vw] h-[90vh] p-0 gap-0 flex flex-col" showCloseButton={false}>
        <DialogHeader className="p-4 border-b border-gray-200 shrink-0 bg-blue-50">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-gray-900">
                {isEditMode ? `Edit Rule Set: ${ruleSetName || editingRuleSetId}` : 'Bulk Rule Builder'}
              </DialogTitle>
              <DialogDescription className="text-gray-600">
                {isEditMode
                  ? 'Update the ranges, values, and options for all rules in this rule set'
                  : 'Create multiple pricing rules efficiently using predefined ranges and values'}
              </DialogDescription>
            </div>
            {(isEditMode || currentStep !== 'mode') && (
              <Badge variant="outline" className="bg-white text-blue-700 border-blue-300">
                {builderMode === 'matrix' ? 'Matrix Mode (2D)' : 'List Mode (1D)'}
              </Badge>
            )}
          </div>
        </DialogHeader>

        <Tabs value={currentStep} onValueChange={setCurrentStep} className="flex-1 flex flex-col overflow-hidden">
          <div className="px-4 pt-4 shrink-0">
            {builderMode === 'matrix' ? (
              isEditMode ? (
                <TabsList className="grid w-full grid-cols-5">
                  <TabsTrigger value="dimensions">1. Dimensions</TabsTrigger>
                  <TabsTrigger value="ranges">2. Ranges</TabsTrigger>
                  <TabsTrigger value="matrix">3. Matrix</TabsTrigger>
                  <TabsTrigger value="options">4. Options</TabsTrigger>
                  <TabsTrigger value="review">5. Review</TabsTrigger>
                </TabsList>
              ) : (
                <TabsList className="grid w-full grid-cols-6">
                  <TabsTrigger value="mode">1. Mode</TabsTrigger>
                  <TabsTrigger value="dimensions">2. Dimensions</TabsTrigger>
                  <TabsTrigger value="ranges">3. Ranges</TabsTrigger>
                  <TabsTrigger value="matrix">4. Matrix</TabsTrigger>
                  <TabsTrigger value="options">5. Options</TabsTrigger>
                  <TabsTrigger value="review">6. Review</TabsTrigger>
                </TabsList>
              )
            ) : (
              isEditMode ? (
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="dimensions">1. Setup</TabsTrigger>
                  <TabsTrigger value="values">2. Ranges & Values</TabsTrigger>
                  <TabsTrigger value="options">3. Options</TabsTrigger>
                  <TabsTrigger value="review">4. Review</TabsTrigger>
                </TabsList>
              ) : (
                <TabsList className="grid w-full grid-cols-5">
                  <TabsTrigger value="mode">1. Mode</TabsTrigger>
                  <TabsTrigger value="dimensions">2. Setup</TabsTrigger>
                  <TabsTrigger value="values">3. Ranges & Values</TabsTrigger>
                  <TabsTrigger value="options">4. Options</TabsTrigger>
                  <TabsTrigger value="review">5. Review</TabsTrigger>
                </TabsList>
              )
            )}
          </div>

          <div className="flex-1 overflow-y-auto px-4 pb-4">
            <div className="p-4">
              {/* Step 1: Builder Mode Selection */}
              <TabsContent value="mode" className="mt-0">
                <div className="max-w-3xl mx-auto py-8">
                  <div className="text-center mb-8">
                    <h2 className="text-2xl font-semibold text-gray-900 mb-2">Select Builder Mode</h2>
                    <p className="text-gray-600">Choose how you want to create your pricing rules</p>
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    {/* Matrix Mode Card */}
                    <button
                      type="button"
                      onClick={() => {
                        setBuilderMode('matrix')
                        setCurrentStep('dimensions')
                      }}
                      className={cn(
                        "relative p-6 rounded-xl border-2 text-left transition-all hover:shadow-lg",
                        builderMode === 'matrix' 
                          ? "border-blue-500 bg-blue-50 shadow-md" 
                          : "border-gray-200 bg-white hover:border-blue-300"
                      )}
                    >
                      <div className="flex items-start gap-4">
                        <div className={cn(
                          "w-12 h-12 rounded-lg flex items-center justify-center shrink-0",
                          builderMode === 'matrix' ? "bg-blue-500 text-white" : "bg-gray-100 text-gray-600"
                        )}>
                          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                          </svg>
                        </div>
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-gray-900 mb-1">Matrix Mode (2D)</h3>
                          <p className="text-sm text-gray-600 mb-4">
                            Create rules using a two-dimensional grid with rows and columns representing different ranges.
                          </p>
                          <div className="space-y-2 text-sm text-gray-500">
                            <div className="flex items-center gap-2">
                              <ChevronRight className="w-4 h-4 text-blue-500" />
                              <span>Best for FICO vs Loan Amount grids</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <ChevronRight className="w-4 h-4 text-blue-500" />
                              <span>Define values for each cell intersection</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <ChevronRight className="w-4 h-4 text-blue-500" />
                              <span>Visual spreadsheet-like editing</span>
                            </div>
                          </div>
                        </div>
                      </div>
                      {builderMode === 'matrix' && (
                        <div className="absolute top-3 right-3">
                          <Badge className="bg-blue-500 text-white">Selected</Badge>
                        </div>
                      )}
                    </button>

                    {/* List Mode Card */}
                    <button
                      type="button"
                      onClick={() => {
                        setBuilderMode('list')
                        setCurrentStep('dimensions')
                      }}
                      className={cn(
                        "relative p-6 rounded-xl border-2 text-left transition-all hover:shadow-lg",
                        builderMode === 'list' 
                          ? "border-blue-500 bg-blue-50 shadow-md" 
                          : "border-gray-200 bg-white hover:border-blue-300"
                      )}
                    >
                      <div className="flex items-start gap-4">
                        <div className={cn(
                          "w-12 h-12 rounded-lg flex items-center justify-center shrink-0",
                          builderMode === 'list' ? "bg-blue-500 text-white" : "bg-gray-100 text-gray-600"
                        )}>
                          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                          </svg>
                        </div>
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-gray-900 mb-1">List Mode (1D)</h3>
                          <p className="text-sm text-gray-600 mb-4">
                            Create rules using a single dimension with ranges and corresponding values in a simple list format.
                          </p>
                          <div className="space-y-2 text-sm text-gray-500">
                            <div className="flex items-center gap-2">
                              <ChevronRight className="w-4 h-4 text-blue-500" />
                              <span>Best for single-variable rules</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <ChevronRight className="w-4 h-4 text-blue-500" />
                              <span>One value per range</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <ChevronRight className="w-4 h-4 text-blue-500" />
                              <span>Quick incremental fill options</span>
                            </div>
                          </div>
                        </div>
                      </div>
                      {builderMode === 'list' && (
                        <div className="absolute top-3 right-3">
                          <Badge className="bg-blue-500 text-white">Selected</Badge>
                        </div>
                      )}
                    </button>
                  </div>

                  <div className="mt-8 text-center">
                    <Button 
                      size="lg" 
                      onClick={() => setCurrentStep('dimensions')}
                      className="px-8"
                    >
                      Continue with {builderMode === 'matrix' ? 'Matrix' : 'List'} Mode
                      <ChevronRight className="w-4 h-4 ml-2" />
                    </Button>
                  </div>
                </div>
              </TabsContent>

              {/* Step 2: Dimensions */}
              <TabsContent value="dimensions" className="mt-0 space-y-6">
                {builderMode === 'matrix' ? (
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label>Dimension X (Rows)</Label>
                      <Select value={xDimension} onValueChange={(v) => setXDimension(v as DimensionType)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {DIMENSION_OPTIONS.filter(d => d.value !== yDimension).map((dim) => (
                            <SelectItem key={dim.value} value={dim.value}>
                              {dim.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Dimension Y (Columns)</Label>
                      <Select value={yDimension} onValueChange={(v) => setYDimension(v as DimensionType)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {DIMENSION_OPTIONS.filter(d => d.value !== xDimension).map((dim) => (
                            <SelectItem key={dim.value} value={dim.value}>
                              {dim.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label>Dimension (Range Variable)</Label>
                      <Select value={listDimension} onValueChange={(v) => setListDimension(v as DimensionType)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {DIMENSION_OPTIONS.filter(d => !['price', 'fee', 'margin'].includes(d.value)).map((dim) => (
                            <SelectItem key={dim.value} value={dim.value}>
                              {dim.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-gray-500">
                        Select the variable to create ranges for (e.g., Loan Amount, FICO, LTV)
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label>Value Type (Assigned to Each Range)</Label>
                      <Select value={cellValueType} onValueChange={(v) => setCellValueType(v as CellValueType)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {CELL_VALUE_OPTIONS.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-gray-500">
                        Select what value to assign to each range (e.g., Margin %, Fee, Price)
                      </p>
                    </div>
                  </div>
                )}

                <div className="border-t pt-6">
                  <h3 className="font-medium mb-4">Base Rule Template</h3>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label>
                          Rule Set Name
                          {!isEditMode && (
                            <span className="ml-1 text-red-600 font-bold">*</span>
                          )}
                        </Label>
                        <span className={cn(
                          'text-xs tabular-nums',
                          ruleSetName.length >= 30 ? 'text-red-500 font-medium' : ruleSetName.length >= 24 ? 'text-orange-500' : 'text-gray-400'
                        )}>
                          {ruleSetName.length}/30
                        </span>
                      </div>
                      <Input
                        value={ruleSetName}
                        onChange={(e) => setRuleSetName(e.target.value.slice(0, 30))}
                        placeholder="e.g., Conv 30yr Purchase Matrix"
                        maxLength={30}
                        className={!ruleSetName && !isEditMode ? 'border-orange-300 focus:border-orange-500' : ''}
                      />
                      <p className="text-xs text-gray-500">
                        {isEditMode
                          ? 'Updating the rule set name will apply to all rules in this set.'
                          : 'All generated rules will be grouped under this rule set name. Required.'}
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label>Rule Description Prefix</Label>
                      <Input
                        value={descriptionPrefix}
                        onChange={(e) => setDescriptionPrefix(e.target.value)}
                        placeholder="e.g., Conv 30yr"
                      />
                      <p className="text-xs text-gray-500">
                        {builderMode === 'matrix' 
                          ? `Each rule will be named: ${descriptionPrefix} | [X Range] | [Y Range]`
                          : `Each rule will be named: ${descriptionPrefix} | [Range]`
                        }
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="base-disallow"
                        checked={disallow}
                        onCheckedChange={(checked) => setDisallow(checked === true)}
                      />
                      <Label htmlFor="base-disallow">Disallow (applies to all generated rules)</Label>
                    </div>

                    <p className="text-sm text-gray-500 bg-blue-50 p-3 rounded-lg border border-blue-200">
                      Configure additional options like Lenders, Product Families, Property Types, and Schedule in the <strong>Options</strong> step.
                    </p>
                  </div>
                </div>
              </TabsContent>

              {/* Step 2: Ranges (Matrix mode only) */}
              {builderMode === 'matrix' && (
                <TabsContent value="ranges" className="mt-0">
                  <div className="grid grid-cols-2 gap-6" style={{ minHeight: '500px' }}>
                    <RangeBuilder
                      dimension={xDimension}
                      ranges={xRanges}
                      onChange={setXRanges}
                    />
                    <RangeBuilder
                      dimension={yDimension}
                      ranges={yRanges}
                      onChange={setYRanges}
                    />
                  </div>
                </TabsContent>
              )}

              {/* Step 2: Values (List mode only) */}
              {builderMode === 'list' && (
                <TabsContent value="values" className="mt-0">
                  <div style={{ minHeight: '500px' }}>
                    <ListBuilder
                      dimension={listDimension}
                      ranges={listRanges}
                      onChange={handleListRangesChange}
                      valueType={cellValueType}
                    />
                  </div>
                </TabsContent>
              )}

              {/* Step 3: Matrix (Matrix mode only) */}
              {builderMode === 'matrix' && (
                <TabsContent value="matrix" className="mt-0 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <Label>Cell value represents:</Label>
                      <Select value={cellValueType} onValueChange={(v) => setCellValueType(v as CellValueType)}>
                        <SelectTrigger className="w-40">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {CELL_VALUE_OPTIONS.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <MatrixGrid
                    xRanges={xRanges}
                    yRanges={yRanges}
                    xDimension={xDimension}
                    yDimension={yDimension}
                    cellValues={cellValues}
                    onCellChange={handleCellChange}
                    cellValueType={cellValueType}
                    onUndo={handleUndo}
                    canUndo={canUndo}
                    undoCount={undoStackRef.current.length}
                  />
                </TabsContent>
              )}

              {/* Options Step - All additional criteria */}
              <TabsContent value="options" className="mt-0 space-y-8">
                {/* ==================== STEP 1: REQUIRED ACTION ==================== */}
                <div className="border-2 border-blue-300 bg-gradient-to-br from-blue-50 to-blue-25 rounded-lg p-6">
                  <div className="mb-4 flex items-center gap-2">
                    <h2 className="text-lg font-bold text-gray-900">Step 1: Select Action</h2>
                    <span className="text-2xl font-bold text-red-600">*</span>
                  </div>
                  <p className="text-sm text-gray-600 mb-6">Choose what this rule will do. You must select at least one action to continue.</p>

                  {/* Action Inputs Grid */}
                  <div className="space-y-4">
                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label className="font-semibold">Lock Period</Label>
                        <Select value={lockPeriod?.toString() || ''} onValueChange={(v) => setLockPeriod(v ? parseInt(v) : null)}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select period" />
                          </SelectTrigger>
                          <SelectContent>
                            {LOCK_PERIODS.map((period) => (
                              <SelectItem key={period} value={period.toString()}>{period} Days</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label className="font-semibold">Fee Set</Label>
                        <Select value={feeSet} onValueChange={setFeeSet}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select fee set" />
                          </SelectTrigger>
                          <SelectContent>
                            {FEE_SETS.map((fs) => (
                              <SelectItem key={fs} value={fs}>{fs}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label className="font-semibold">MI Company</Label>
                        <Select value={miCompany} onValueChange={setMiCompany}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select MI" />
                          </SelectTrigger>
                          <SelectContent>
                            {MI_COMPANIES.map((mi) => (
                              <SelectItem key={mi} value={mi}>{mi}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label className="font-semibold">Price</Label>
                        <Input type="number" step="0.001" placeholder="0.000" value={price} onChange={(e) => setPrice(e.target.value)} />
                      </div>
                      <div className="space-y-2">
                        <Label className="font-semibold">Rate</Label>
                        <Input type="text" placeholder="0.00%" value={rate} onChange={(e) => setRate(e.target.value)} />
                      </div>
                      <div className="space-y-2">
                        <Label className="font-semibold">Fees</Label>
                        <Input type="number" step="0.01" placeholder="0.00" value={fees} onChange={(e) => setFees(e.target.value)} />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="font-semibold">Margin Type</Label>
                      <div className="flex items-center gap-6">
                        <div className="flex items-center gap-2">
                          <input type="radio" id="margin-pct" checked={marginType === 'percentage'} onChange={() => setMarginType('percentage')} />
                          <Label htmlFor="margin-pct" className="cursor-pointer font-normal">Percentage margin</Label>
                        </div>
                        <div className="flex items-center gap-2">
                          <input type="radio" id="margin-flat" checked={marginType === 'flat'} onChange={() => setMarginType('flat')} />
                          <Label htmlFor="margin-flat" className="cursor-pointer font-normal">Flat fee margin</Label>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label className="font-semibold">Comp Flat Fee</Label>
                        <Input type="number" step="0.01" placeholder="0.00" value={compFlatFee} onChange={(e) => setCompFlatFee(e.target.value)} />
                      </div>
                      <div className="space-y-2">
                        <Label className="font-semibold">Final Price Min</Label>
                        <Input type="number" step="0.001" placeholder="0.000" value={finalPriceMin} onChange={(e) => setFinalPriceMin(e.target.value)} />
                      </div>
                      <div className="space-y-2">
                        <Label className="font-semibold">Final Price Max</Label>
                        <Input type="number" step="0.001" placeholder="0.000" value={finalPriceMax} onChange={(e) => setFinalPriceMax(e.target.value)} />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="font-semibold">Max Cash Back to Borrower</Label>
                        <Input type="number" step="0.01" placeholder="0.00" value={maxCashBack} onChange={(e) => setMaxCashBack(e.target.value)} />
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-4">
                      <div className="flex items-center gap-2">
                        <Checkbox id="has-second" checked={hasSecondMortgage} onCheckedChange={(c) => setHasSecondMortgage(c === true)} />
                        <Label htmlFor="has-second" className="cursor-pointer font-normal">Has second mortgage?</Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <Checkbox id="ignore-eighth" checked={ignoreNonEighthRates} onCheckedChange={(c) => setIgnoreNonEighthRates(c === true)} />
                        <Label htmlFor="ignore-eighth" className="cursor-pointer font-normal">Ignore Non Eighth Rates</Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <Checkbox id="include-ufmip" checked={includeUFMIP} onCheckedChange={(c) => setIncludeUFMIP(c === true)} />
                        <Label htmlFor="include-ufmip" className="cursor-pointer font-normal">Include UFMIP on FHA/VA</Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <Checkbox id="finance-ufmip" checked={financeUFMIP} onCheckedChange={(c) => setFinanceUFMIP(c === true)} />
                        <Label htmlFor="finance-ufmip" className="cursor-pointer font-normal">Finance UFMIP on FHA/VA?</Label>
                      </div>
                    </div>
                  </div>
                </div>

                {/* ==================== STEP 2 & 3: OPTIONAL FILTERS ==================== */}
                {!showOptionalFilters ? (
                  <Button
                    onClick={() => setShowOptionalFilters(true)}
                    variant="outline"
                    className="w-full h-10 border-2 border-dashed border-gray-300 text-gray-600 hover:border-gray-400 hover:bg-gray-50 font-normal"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add additional filters
                  </Button>
                ) : (
                  <div className="space-y-6">
                    {/* Borrower & Property Criteria Section */}
                    <Collapsible defaultOpen={false}>
                      <CollapsibleTrigger className="flex w-full items-center justify-between p-3 rounded-lg border border-gray-200 bg-gray-50 hover:bg-gray-100 transition-colors">
                        <div className="flex items-center gap-3">
                          <h3 className="font-semibold text-gray-700 text-sm">Borrower & Property Criteria</h3>
                          <span className="text-xs bg-gray-200 text-gray-600 px-2 py-1 rounded">
                            LTV, FICO, Loan Amount, Property Type, Usage, Loan Type, Channel, States
                          </span>
                        </div>
                        <ChevronDown className="h-4 w-4 text-gray-500" />
                      </CollapsibleTrigger>
                      <CollapsibleContent className="p-4 border border-t-0 border-gray-200 bg-white rounded-b-lg space-y-4">
                        <div className="grid grid-cols-2 gap-6">
                          {/* LTV Range */}
                          <Collapsible>
                            <CollapsibleTrigger className="flex items-center justify-between w-full p-2 hover:bg-gray-50 rounded">
                              <span className="text-sm font-medium text-gray-600">LTV Range</span>
                              <ChevronRight className="h-4 w-4 text-gray-400" />
                            </CollapsibleTrigger>
                            <CollapsibleContent className="p-2 space-y-2 mt-1">
                              <div className="grid grid-cols-2 gap-2">
                                <Input type="number" placeholder="Min" />
                                <Input type="number" placeholder="Max" />
                              </div>
                            </CollapsibleContent>
                          </Collapsible>

                          {/* FICO Range */}
                          <Collapsible>
                            <CollapsibleTrigger className="flex items-center justify-between w-full p-2 hover:bg-gray-50 rounded">
                              <span className="text-sm font-medium text-gray-600">FICO Range</span>
                              <ChevronRight className="h-4 w-4 text-gray-400" />
                            </CollapsibleTrigger>
                            <CollapsibleContent className="p-2 space-y-2 mt-1">
                              <div className="grid grid-cols-2 gap-2">
                                <Input type="number" placeholder="Min" />
                                <Input type="number" placeholder="Max" />
                              </div>
                            </CollapsibleContent>
                          </Collapsible>

                          {/* Loan Amount Range */}
                          <Collapsible>
                            <CollapsibleTrigger className="flex items-center justify-between w-full p-2 hover:bg-gray-50 rounded">
                              <span className="text-sm font-medium text-gray-600">Loan Amount Range</span>
                              <ChevronRight className="h-4 w-4 text-gray-400" />
                            </CollapsibleTrigger>
                            <CollapsibleContent className="p-2 space-y-2 mt-1">
                              <div className="grid grid-cols-2 gap-2">
                                <Input type="number" placeholder="Min" />
                                <Input type="number" placeholder="Max" />
                              </div>
                            </CollapsibleContent>
                          </Collapsible>

                          {/* Property Type */}
                          <Collapsible>
                            <CollapsibleTrigger className="flex items-center justify-between w-full p-2 hover:bg-gray-50 rounded">
                              <span className="text-sm font-medium text-gray-600">Property Type</span>
                              <ChevronRight className="h-4 w-4 text-gray-400" />
                            </CollapsibleTrigger>
                            <CollapsibleContent className="p-2 space-y-1 mt-1 max-h-48 overflow-y-auto">
                              {PROPERTY_TYPES.map((type) => (
                                <div key={type} className="flex items-center gap-2">
                                  <Checkbox id={`pt-${type}`} checked={selectedPropertyTypes.includes(type)} onCheckedChange={() => togglePropertyType(type)} />
                                  <Label htmlFor={`pt-${type}`} className="text-xs cursor-pointer text-gray-600">{type}</Label>
                                </div>
                              ))}
                            </CollapsibleContent>
                          </Collapsible>

                          {/* Property Usage */}
                          <Collapsible>
                            <CollapsibleTrigger className="flex items-center justify-between w-full p-2 hover:bg-gray-50 rounded">
                              <span className="text-sm font-medium text-gray-600">Property Usage</span>
                              <ChevronRight className="h-4 w-4 text-gray-400" />
                            </CollapsibleTrigger>
                            <CollapsibleContent className="p-2 space-y-1 mt-1 max-h-48 overflow-y-auto">
                              {PROPERTY_USAGE.map((usage) => (
                                <div key={usage} className="flex items-center gap-2">
                                  <Checkbox id={`pu-${usage}`} checked={selectedPropertyUsage.includes(usage)} onCheckedChange={() => togglePropertyUsage(usage)} />
                                  <Label htmlFor={`pu-${usage}`} className="text-xs cursor-pointer text-gray-600">{usage}</Label>
                                </div>
                              ))}
                            </CollapsibleContent>
                          </Collapsible>

                          {/* Loan Type */}
                          <Collapsible>
                            <CollapsibleTrigger className="flex items-center justify-between w-full p-2 hover:bg-gray-50 rounded">
                              <span className="text-sm font-medium text-gray-600">Loan Type</span>
                              <ChevronRight className="h-4 w-4 text-gray-400" />
                            </CollapsibleTrigger>
                            <CollapsibleContent className="p-2 space-y-1 mt-1 max-h-48 overflow-y-auto">
                              {LOAN_TYPES.map((type) => (
                                <div key={type} className="flex items-center gap-2">
                                  <Checkbox id={`lt-${type}`} checked={selectedLoanTypes.includes(type)} onCheckedChange={() => toggleLoanType(type)} />
                                  <Label htmlFor={`lt-${type}`} className="text-xs cursor-pointer text-gray-600">{type}</Label>
                                </div>
                              ))}
                            </CollapsibleContent>
                          </Collapsible>

                          {/* Quoting Channel */}
                          <Collapsible>
                            <CollapsibleTrigger className="flex items-center justify-between w-full p-2 hover:bg-gray-50 rounded">
                              <span className="text-sm font-medium text-gray-600">Quoting Channel</span>
                              <ChevronRight className="h-4 w-4 text-gray-400" />
                            </CollapsibleTrigger>
                            <CollapsibleContent className="p-2 space-y-1 mt-1 max-h-48 overflow-y-auto">
                              {QUOTING_CHANNELS.map((channel) => (
                                <div key={channel} className="flex items-center gap-2">
                                  <Checkbox id={`qc-${channel}`} checked={selectedQuotingChannels.includes(channel)} onCheckedChange={() => toggleQuotingChannel(channel)} />
                                  <Label htmlFor={`qc-${channel}`} className="text-xs cursor-pointer text-gray-600">{channel}</Label>
                                </div>
                              ))}
                            </CollapsibleContent>
                          </Collapsible>

                          {/* States */}
                          <Collapsible>
                            <CollapsibleTrigger className="flex items-center justify-between w-full p-2 hover:bg-gray-50 rounded">
                              <span className="text-sm font-medium text-gray-600">States</span>
                              <ChevronRight className="h-4 w-4 text-gray-400" />
                            </CollapsibleTrigger>
                            <CollapsibleContent className="p-2 space-y-1 mt-1">
                              <Input placeholder="Search states..." value={statesSearchTerm} onChange={(e) => setStatesSearchTerm(e.target.value)} className="text-xs mb-2" />
                              <div className="space-y-1 max-h-48 overflow-y-auto">
                                {STATES.filter(s => s.toLowerCase().includes(statesSearchTerm.toLowerCase())).map((state) => (
                                  <div key={state} className="flex items-center gap-2">
                                    <Checkbox id={`s-${state}`} checked={selectedStates.includes(state)} onCheckedChange={() => toggleState(state)} />
                                    <Label htmlFor={`s-${state}`} className="text-xs cursor-pointer text-gray-600">{state}</Label>
                                  </div>
                                ))}
                              </div>
                            </CollapsibleContent>
                          </Collapsible>
                        </div>
                      </CollapsibleContent>
                    </Collapsible>

                    {/* Program Filters Section */}
                    <Collapsible defaultOpen={false}>
                      <CollapsibleTrigger className="flex w-full items-center justify-between p-3 rounded-lg border border-gray-200 bg-gray-50 hover:bg-gray-100 transition-colors">
                        <div className="flex items-center gap-3">
                          <h3 className="font-semibold text-gray-700 text-sm">Program Filters</h3>
                          <span className="text-xs bg-gray-200 text-gray-600 px-2 py-1 rounded">
                            Lenders, Families, Classes, Types, Terms
                          </span>
                        </div>
                        <ChevronDown className="h-4 w-4 text-gray-500" />
                      </CollapsibleTrigger>
                      <CollapsibleContent className="p-4 border border-t-0 border-gray-200 bg-white rounded-b-lg space-y-4">
                        <div className="grid grid-cols-2 gap-6">
                          {/* Lenders */}
                          <Collapsible>
                            <CollapsibleTrigger className="flex items-center justify-between w-full p-2 hover:bg-gray-50 rounded">
                              <span className="text-sm font-medium text-gray-600">Lenders</span>
                              <ChevronRight className="h-4 w-4 text-gray-400" />
                            </CollapsibleTrigger>
                            <CollapsibleContent className="p-2 space-y-1 mt-1 max-h-48 overflow-y-auto">
                              {LENDERS.map((lender) => (
                                <div key={lender} className="flex items-center gap-2">
                                  <Checkbox id={`ln-${lender}`} checked={selectedLenders.includes(lender)} onCheckedChange={() => toggleLender(lender)} />
                                  <Label htmlFor={`ln-${lender}`} className="text-xs cursor-pointer text-gray-600">{lender}</Label>
                                </div>
                              ))}
                            </CollapsibleContent>
                          </Collapsible>

                          {/* Families */}
                          <Collapsible>
                            <CollapsibleTrigger className="flex items-center justify-between w-full p-2 hover:bg-gray-50 rounded">
                              <span className="text-sm font-medium text-gray-600">Families</span>
                              <ChevronRight className="h-4 w-4 text-gray-400" />
                            </CollapsibleTrigger>
                            <CollapsibleContent className="p-2 space-y-1 mt-1 max-h-48 overflow-y-auto">
                              {PRODUCT_FAMILIES.map((family) => (
                                <div key={family} className="flex items-center gap-2">
                                  <Checkbox id={`pf-${family}`} checked={selectedProductFamilies.includes(family)} onCheckedChange={() => toggleProductFamily(family)} />
                                  <Label htmlFor={`pf-${family}`} className="text-xs cursor-pointer text-gray-600">{family}</Label>
                                </div>
                              ))}
                            </CollapsibleContent>
                          </Collapsible>

                          {/* Classes */}
                          <Collapsible>
                            <CollapsibleTrigger className="flex items-center justify-between w-full p-2 hover:bg-gray-50 rounded">
                              <span className="text-sm font-medium text-gray-600">Classes</span>
                              <ChevronRight className="h-4 w-4 text-gray-400" />
                            </CollapsibleTrigger>
                            <CollapsibleContent className="p-2 space-y-1 mt-1 max-h-48 overflow-y-auto">
                              {PRODUCT_CLASSES.map((cls) => (
                                <div key={cls} className="flex items-center gap-2">
                                  <Checkbox id={`pc-${cls}`} checked={selectedProductClasses.includes(cls)} onCheckedChange={() => toggleProductClass(cls)} />
                                  <Label htmlFor={`pc-${cls}`} className="text-xs cursor-pointer text-gray-600">{cls}</Label>
                                </div>
                              ))}
                            </CollapsibleContent>
                          </Collapsible>

                          {/* Types */}
                          <Collapsible>
                            <CollapsibleTrigger className="flex items-center justify-between w-full p-2 hover:bg-gray-50 rounded">
                              <span className="text-sm font-medium text-gray-600">Types</span>
                              <ChevronRight className="h-4 w-4 text-gray-400" />
                            </CollapsibleTrigger>
                            <CollapsibleContent className="p-2 space-y-1 mt-1 max-h-48 overflow-y-auto">
                              {PRODUCT_TYPES.map((type) => (
                                <div key={type} className="flex items-center gap-2">
                                  <Checkbox id={`pty-${type}`} checked={selectedProductTypes.includes(type)} onCheckedChange={() => toggleProductType(type)} />
                                  <Label htmlFor={`pty-${type}`} className="text-xs cursor-pointer text-gray-600">{type}</Label>
                                </div>
                              ))}
                            </CollapsibleContent>
                          </Collapsible>

                          {/* Terms */}
                          <Collapsible>
                            <CollapsibleTrigger className="flex items-center justify-between w-full p-2 hover:bg-gray-50 rounded">
                              <span className="text-sm font-medium text-gray-600">Terms</span>
                              <ChevronRight className="h-4 w-4 text-gray-400" />
                            </CollapsibleTrigger>
                            <CollapsibleContent className="p-2 space-y-1 mt-1 max-h-48 overflow-y-auto">
                              {PRODUCT_TERMS.map((term) => (
                                <div key={term} className="flex items-center gap-2">
                                  <Checkbox id={`pterm-${term}`} checked={selectedProductTerms.includes(term)} onCheckedChange={() => toggleProductTerm(term)} />
                                  <Label htmlFor={`pterm-${term}`} className="text-xs cursor-pointer text-gray-600">{term}</Label>
                                </div>
                              ))}
                            </CollapsibleContent>
                          </Collapsible>
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  </div>
                )}

                {/* ==================== OPTIONAL: SCHEDULE ==================== */}
                <Collapsible defaultOpen={false}>
                  <CollapsibleTrigger className="flex w-full items-center justify-between p-3 rounded-lg border border-gray-200 bg-gray-50 hover:bg-gray-100 transition-colors">
                    <h3 className="font-semibold text-gray-700 text-sm">Schedule (Optional)</h3>
                    <ChevronDown className="h-4 w-4 text-gray-500" />
                  </CollapsibleTrigger>
                  <CollapsibleContent className="p-4 border border-t-0 border-gray-200 bg-white rounded-b-lg space-y-4">
                    <p className="text-xs text-gray-500">For time-sensitive pricing only. Leave blank if not needed.</p>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-sm">Start Date</Label>
                        <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm">End Date</Label>
                        <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm">Start Time (ET)</Label>
                        <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm">End Time (ET)</Label>
                        <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm">Days of Week</Label>
                      <div className="flex gap-2">
                        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                          <div key={day} className="flex items-center gap-1">
                            <Checkbox id={`day-${day}`} checked={selectedDays.includes(day)} onCheckedChange={() => toggleDay(day)} />
                            <Label htmlFor={`day-${day}`} className="text-xs cursor-pointer">{day}</Label>
                          </div>
                        ))}
                      </div>
                    </div>
                  </CollapsibleContent>
                </Collapsible>

                {/* ==================== VISIBILITY ==================== */}
                <div className="p-3 rounded-lg border border-gray-200 bg-gray-50">
                  <div className="flex items-center gap-3">
                    <Checkbox id="hide-quote-adj" checked={hideInQuoteAdjustments} onCheckedChange={(c) => setHideInQuoteAdjustments(c === true)} />
                    <div>
                      <Label htmlFor="hide-quote-adj" className="text-sm font-medium cursor-pointer text-gray-700">Hide in quote adjustments</Label>
                      <p className="text-xs text-gray-500 mt-0.5">Only you will see this rule&apos;s adjustments</p>
                    </div>
                  </div>
                </div>
              </TabsContent>

              {/* Review Step */}
              <TabsContent value="review" className="mt-0 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium">Rules to be created</h3>
                    <p className="text-sm text-gray-500">
                      {previewRules.length} rules will be staged as drafts
                    </p>
                  </div>
                  <Badge variant="secondary" className="text-lg px-4 py-1">
                    {previewRules.length} rules
                  </Badge>
                </div>

                <div className="space-y-2 max-h-[400px] overflow-y-auto">
                  {previewRules.map(({ description, cellValue, rule }, index) => (
                    <Collapsible
                      key={index}
                      open={previewExpanded === description}
                      onOpenChange={(open) => setPreviewExpanded(open ? description : null)}
                    >
                      <div className="border rounded-lg">
                        <CollapsibleTrigger className="flex items-center justify-between w-full p-3 hover:bg-gray-200">
                          <div className="flex items-center gap-3">
                            {previewExpanded === description ? (
                              <ChevronDown className="h-4 w-4 text-gray-500" />
                            ) : (
                              <ChevronRight className="h-4 w-4 text-gray-500" />
                            )}
                            <span className="text-sm font-medium">{description}</span>
                          </div>
                          <Badge variant="outline">
                            {cellValueType}: {cellValue || '0'}
                          </Badge>
                        </CollapsibleTrigger>
                        <CollapsibleContent className="px-3 pb-3 pt-2 border-t bg-gray-50">
                          <div className="grid grid-cols-3 gap-4 text-sm">
                            <div>
                              <span className="text-gray-500">Lenders:</span>
                              <p className="font-medium">{rule.Lenders.length > 0 ? rule.Lenders.join(', ') : 'None'}</p>
                            </div>
                            <div>
                              <span className="text-gray-500">Product Family:</span>
                              <p className="font-medium">{rule.ProductFamilies[0] || 'None'}</p>
                            </div>
                            <div>
                              <span className="text-gray-500">Disallow:</span>
                              <p className="font-medium">{rule.Disallow ? 'Yes' : 'No'}</p>
                            </div>
                            {(builderMode === 'matrix' || listDimension === 'fico') && (
                              <div>
                                <span className="text-gray-500">FICO Range:</span>
                                <p className="font-medium">{rule.FICOMin} - {rule.FICOMax}</p>
                              </div>
                            )}
                            {(builderMode === 'matrix' || listDimension === 'loanAmount') && (
                              <div>
                                <span className="text-gray-500">Loan Amount:</span>
                                <p className="font-medium">${rule.LoanAmountMin.toLocaleString()} - ${rule.LoanAmountMax.toLocaleString()}</p>
                              </div>
                            )}
                            {(builderMode === 'matrix' || listDimension === 'ltv') && (
                              <div>
                                <span className="text-gray-500">LTV:</span>
                                <p className="font-medium">{rule.LTVMin}% - {rule.LTVMax}%</p>
                              </div>
                            )}
                          </div>
                        </CollapsibleContent>
                      </div>
                    </Collapsible>
                  ))}
                </div>
              </TabsContent>
            </div>
          </div>
        </Tabs>

        <div className="flex items-center justify-between p-4 border-t border-gray-200 bg-gray-50 shrink-0">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="border-gray-300">
            Cancel
          </Button>
          <div className="flex items-center gap-2">
            {currentStep !== getSteps()[0] && (
              <Button
                variant="outline"
                onClick={() => {
                  const steps = getSteps()
                  const currentIndex = steps.indexOf(currentStep)
                  if (currentIndex > 0) {
                    setCurrentStep(steps[currentIndex - 1])
                  }
                }}
              >
                Previous
              </Button>
            )}

            {currentStep === 'review' ? (
              <Button
                onClick={handleStageAll}
                className="bg-blue-600 hover:bg-blue-700 text-white font-medium"
                disabled={previewRules.length === 0}
              >
                {isEditMode
                  ? `Stage Updates (${previewRules.length} rules)`
                  : `Stage All (${previewRules.length} rules)`}
              </Button>
            ) : (
              <Button
                onClick={() => {
                  const steps = getSteps()
                  const currentIndex = steps.indexOf(currentStep)
                  if (currentIndex < steps.length - 1) {
                    setCurrentStep(steps[currentIndex + 1])
                  }
                }}
              >
                Next
              </Button>
            )}
          </div>
        </div>
      </DialogContent>

      {/* Mode Change Warning Dialog */}
      <AlertDialog open={showModeChangeWarning} onOpenChange={setShowModeChangeWarning}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Switch Builder Mode?</AlertDialogTitle>
            <AlertDialogDescription>
              Switching from {builderMode === 'matrix' ? 'Matrix' : 'List'} mode to {pendingMode === 'matrix' ? 'Matrix' : 'List'} mode will reset all your current configuration. Any ranges, values, or settings you have entered will be lost.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={cancelModeChange}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmModeChange} className="bg-blue-600 hover:bg-blue-700">
              Switch Mode
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Rule Set Edit Summary / Confirmation Modal */}
      <RuleSetEditSummaryModal
        open={showSummaryModal}
        onOpenChange={setShowSummaryModal}
        ruleSetName={ruleSetName || editingRuleSetId || ''}
        diffs={pendingDiffs}
        onConfirm={() => executeStage(pendingDiffs)}
      />
    </Dialog>
  )
}
