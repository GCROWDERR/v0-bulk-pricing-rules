'use client'

import { useState, useMemo, useCallback } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
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
} from 'lucide-react'
import { usePricingRules } from '@/lib/pricing-rules-context'
import { LENDERS, PRODUCT_FAMILIES, createBlankRule } from '@/lib/pricing-rules-data'
import type { PricingRule } from '@/lib/pricing-rules-data'
import { cn } from '@/lib/utils'

interface RuleBuilderDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
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

interface MatrixGridProps {
  xRanges: Range[]
  yRanges: Range[]
  xDimension: DimensionType
  yDimension: DimensionType
  cellValues: Record<string, string>
  onCellChange: (key: string, value: string) => void
  cellValueType: CellValueType
}

function MatrixGrid({
  xRanges,
  yRanges,
  xDimension,
  yDimension,
  cellValues,
  onCellChange,
  cellValueType,
}: MatrixGridProps) {
  const [fillValue, setFillValue] = useState('')
  const [selectedCells, setSelectedCells] = useState<Set<string>>(new Set())
  const [isSelecting, setIsSelecting] = useState(false)
  const [selectionStart, setSelectionStart] = useState<{ xIdx: number; yIdx: number } | null>(null)

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
            {selectedCells.size > 0 && (
              <Button size="sm" variant="ghost" onClick={handleClearSelection} className="h-9">
                Clear Selection ({selectedCells.size})
              </Button>
            )}
          </div>
        </div>
        <p className="text-xs text-slate-500">
          Click cells to select them. Hold Ctrl/Cmd to toggle individual cells. Click and drag to select a range. Shift+click to extend selection.
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
                <th key={yRange.id} className="border p-2 text-xs font-medium text-gray-600 min-w-[100px]">
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
                  return (
                    <td 
                      key={key} 
                      className={cn(
                        'border p-1 cursor-pointer transition-colors',
                        isSelected && 'bg-blue-100 ring-2 ring-inset ring-blue-500'
                      )}
                      onMouseDown={(e) => handleMouseDown(key, xIdx, yIdx, e)}
                      onMouseEnter={() => handleMouseEnter(key, xIdx, yIdx)}
                    >
                      <Input
                        type={cellValueType === 'disallow' ? 'text' : 'number'}
                        step={cellValueType === 'price' || cellValueType === 'margin' ? '0.001' : '0.01'}
                        value={cellValues[key] || ''}
                        onChange={(e) => onCellChange(key, e.target.value)}
                        className={cn(
                          'h-8 text-center text-sm font-mono pointer-events-auto',
                          isSelected && 'bg-blue-50 border-blue-300'
                        )}
                        placeholder={cellValueType === 'disallow' ? '-' : '0'}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export function RuleBuilderDialog({ open, onOpenChange }: RuleBuilderDialogProps) {
  const { stageCreate } = usePricingRules()
  const [currentStep, setCurrentStep] = useState('dimensions')

  // Step 1: Dimensions & Base Rule
  const [xDimension, setXDimension] = useState<DimensionType>('loanAmount')
  const [yDimension, setYDimension] = useState<DimensionType>('fico')
  const [descriptionPrefix, setDescriptionPrefix] = useState('Conv 30yr')
  const [disallow, setDisallow] = useState(false)
  const [selectedLenders, setSelectedLenders] = useState<string[]>([])
  const [selectedProductFamily, setSelectedProductFamily] = useState<string>('')

  // Step 2: Ranges
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

  // Step 3: Matrix values
  const [cellValueType, setCellValueType] = useState<CellValueType>('price')
  const [cellValues, setCellValues] = useState<Record<string, string>>({})

  // Preview state
  const [previewExpanded, setPreviewExpanded] = useState<string | null>(null)

  const handleCellChange = useCallback((key: string, value: string) => {
    setCellValues(prev => ({ ...prev, [key]: value }))
  }, [])

  // Generate preview rules
  const previewRules = useMemo(() => {
    const rules: Array<{
      description: string
      xRange: Range
      yRange: Range
      cellValue: string
      rule: PricingRule
    }> = []

    let tempId = -Date.now()

    xRanges.forEach(xRange => {
      yRanges.forEach(yRange => {
        const key = `${xRange.id}-${yRange.id}`
        const cellValue = cellValues[key] || '0'
        const xLabel = formatRangeLabel(xRange, xDimension)
        const yLabel = formatRangeLabel(yRange, yDimension)
        const description = `${descriptionPrefix} | ${xLabel} | ${yLabel}`

        const rule = createBlankRule(tempId--)
        rule.RuleDescription = description
        rule.Disallow = disallow || cellValueType === 'disallow' && cellValue.toLowerCase() === 'yes'
        rule.Lenders = selectedLenders
        rule.ProductFamilies = selectedProductFamily ? [selectedProductFamily] : []

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

        rules.push({
          description,
          xRange,
          yRange,
          cellValue,
          rule,
        })
      })
    })

    return rules
  }, [xRanges, yRanges, xDimension, yDimension, cellValues, cellValueType, descriptionPrefix, disallow, selectedLenders, selectedProductFamily])

  const handleStageAll = () => {
    previewRules.forEach(({ rule }) => {
      stageCreate(rule)
    })
    onOpenChange(false)
    // Reset state
    setCurrentStep('dimensions')
    setCellValues({})
  }

  const toggleLender = (lender: string) => {
    if (selectedLenders.includes(lender)) {
      setSelectedLenders(prev => prev.filter(l => l !== lender))
    } else {
      setSelectedLenders(prev => [...prev, lender])
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="!max-w-[95vw] !w-[95vw] h-[90vh] p-0 gap-0 flex flex-col" showCloseButton={false}>
        <DialogHeader className="p-4 border-b border-gray-200 shrink-0 bg-blue-50">
          <DialogTitle className="text-gray-900">Bulk Rule Builder - Matrix Mode</DialogTitle>
          <DialogDescription className="text-gray-600">
            Create multiple rules by defining ranges for two dimensions
          </DialogDescription>
        </DialogHeader>

        <Tabs value={currentStep} onValueChange={setCurrentStep} className="flex-1 flex flex-col overflow-hidden">
          <div className="px-4 pt-4 shrink-0">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="dimensions">1. Dimensions</TabsTrigger>
              <TabsTrigger value="ranges">2. Ranges</TabsTrigger>
              <TabsTrigger value="matrix">3. Matrix</TabsTrigger>
              <TabsTrigger value="review">4. Review</TabsTrigger>
            </TabsList>
          </div>

          <div className="flex-1 overflow-y-auto px-4 pb-4">
            <div className="p-4">
              {/* Step 1: Dimensions */}
              <TabsContent value="dimensions" className="mt-0 space-y-6">
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

                <div className="border-t pt-6">
                  <h3 className="font-medium mb-4">Base Rule Template</h3>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Rule Description Prefix</Label>
                      <Input
                        value={descriptionPrefix}
                        onChange={(e) => setDescriptionPrefix(e.target.value)}
                        placeholder="e.g., Conv 30yr"
                      />
                      <p className="text-xs text-gray-500">
                        Each rule will be named: {descriptionPrefix} | [X Range] | [Y Range]
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

                    <div className="space-y-2">
                      <Label>Product Family</Label>
                      <Select value={selectedProductFamily} onValueChange={setSelectedProductFamily}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select product family" />
                        </SelectTrigger>
                        <SelectContent>
                          {PRODUCT_FAMILIES.map((family) => (
                            <SelectItem key={family} value={family}>
                              {family}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Lenders</Label>
                      <div className="grid grid-cols-3 gap-2 p-3 border rounded-md bg-white max-h-40 overflow-y-auto">
                        {LENDERS.map((lender) => (
                          <div key={lender} className="flex items-center gap-2">
                            <Checkbox
                              id={`lender-${lender}`}
                              checked={selectedLenders.includes(lender)}
                              onCheckedChange={() => toggleLender(lender)}
                            />
                            <Label htmlFor={`lender-${lender}`} className="text-sm cursor-pointer">
                              {lender}
                            </Label>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </TabsContent>

              {/* Step 2: Ranges */}
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

              {/* Step 3: Matrix */}
              <TabsContent value="matrix" className="mt-0 space-y-4">
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

                <MatrixGrid
                  xRanges={xRanges}
                  yRanges={yRanges}
                  xDimension={xDimension}
                  yDimension={yDimension}
                  cellValues={cellValues}
                  onCellChange={handleCellChange}
                  cellValueType={cellValueType}
                />
              </TabsContent>

              {/* Step 4: Review */}
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
                        <CollapsibleTrigger className="flex items-center justify-between w-full p-3 hover:bg-gray-50">
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
                            <div>
                              <span className="text-gray-500">FICO Range:</span>
                              <p className="font-medium">{rule.FICOMin} - {rule.FICOMax}</p>
                            </div>
                            <div>
                              <span className="text-gray-500">Loan Amount:</span>
                              <p className="font-medium">${rule.LoanAmountMin.toLocaleString()} - ${rule.LoanAmountMax.toLocaleString()}</p>
                            </div>
                            <div>
                              <span className="text-gray-500">LTV:</span>
                              <p className="font-medium">{rule.LTVMin}% - {rule.LTVMax}%</p>
                            </div>
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
            {currentStep !== 'dimensions' && (
              <Button
                variant="outline"
                onClick={() => {
                  const steps = ['dimensions', 'ranges', 'matrix', 'review']
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
                className="bg-teal-500 hover:bg-teal-600 text-white font-medium"
                disabled={previewRules.length === 0}
              >
                Stage All ({previewRules.length} rules)
              </Button>
            ) : (
              <Button
                onClick={() => {
                  const steps = ['dimensions', 'ranges', 'matrix', 'review']
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
    </Dialog>
  )
}
