              <TabsContent value="options" className="mt-0 space-y-6">
                {/* STEP 1: Required Action - Emphasized Section */}
                <div className="p-4 bg-blue-50 border-2 border-blue-300 rounded-lg">
                  <div className="mb-3 flex items-center gap-2">
                    <h3 className="text-base font-bold text-gray-900">Step 1: Action</h3>
                    <span className="text-lg font-bold text-red-600">*</span>
                  </div>
                  <p className="text-sm text-gray-600 mb-4">Define what this rule will do. At least one action is required.</p>
                  
                  {/* Action Fields */}
                  <div className="space-y-4">
                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label>Lock Period</Label>
                        <Select value={lockPeriod?.toString() || ''} onValueChange={(v) => setLockPeriod(v ? parseInt(v) : null)}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select" />
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
                      <div className="space-y-2">
                        <Label>Fee Set</Label>
                        <Select value={feeSet} onValueChange={setFeeSet}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select" />
                          </SelectTrigger>
                          <SelectContent>
                            {FEE_SETS.map((fs) => (
                              <SelectItem key={fs} value={fs}>{fs}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>MI Company</Label>
                        <Select value={miCompany} onValueChange={setMiCompany}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select" />
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
                        <Label>Price</Label>
                        <Input type="number" step="0.001" placeholder="Price" value={price} onChange={(e) => setPrice(e.target.value)} />
                      </div>
                      <div className="space-y-2">
                        <Label>Rate</Label>
                        <Input type="text" placeholder="Rate" value={rate} onChange={(e) => setRate(e.target.value)} />
                      </div>
                      <div className="space-y-2">
                        <Label>Fees</Label>
                        <Input type="number" step="0.01" placeholder="Fees" value={fees} onChange={(e) => setFees(e.target.value)} />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Margin Type</Label>
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          <input type="radio" id="margin-pct" checked={marginType === 'percentage'} onChange={() => setMarginType('percentage')} />
                          <Label htmlFor="margin-pct" className="cursor-pointer">Percentage margin</Label>
                        </div>
                        <div className="flex items-center gap-2">
                          <input type="radio" id="margin-flat" checked={marginType === 'flat'} onChange={() => setMarginType('flat')} />
                          <Label htmlFor="margin-flat" className="cursor-pointer">Flat fee margin</Label>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label>Comp Flat Fee</Label>
                        <Input type="number" step="0.01" placeholder="Comp flat fee" value={compFlatFee} onChange={(e) => setCompFlatFee(e.target.value)} />
                      </div>
                      <div className="space-y-2">
                        <Label>Final Price Min</Label>
                        <Input type="number" step="0.001" placeholder="Min" value={finalPriceMin} onChange={(e) => setFinalPriceMin(e.target.value)} />
                      </div>
                      <div className="space-y-2">
                        <Label>Final Price Max</Label>
                        <Input type="number" step="0.001" placeholder="Max" value={finalPriceMax} onChange={(e) => setFinalPriceMax(e.target.value)} />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Max Cash Back to Borrower</Label>
                        <Input type="number" step="0.01" placeholder="Max cash back" value={maxCashBack} onChange={(e) => setMaxCashBack(e.target.value)} />
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-4">
                      <div className="flex items-center gap-2">
                        <Checkbox id="has-second" checked={hasSecondMortgage} onCheckedChange={(c) => setHasSecondMortgage(c === true)} />
                        <Label htmlFor="has-second" className="cursor-pointer text-sm">Has second mortgage?</Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <Checkbox id="ignore-eighth" checked={ignoreNonEighthRates} onCheckedChange={(c) => setIgnoreNonEighthRates(c === true)} />
                        <Label htmlFor="ignore-eighth" className="cursor-pointer text-sm">Ignore Non Eighth Rates</Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <Checkbox id="include-ufmip" checked={includeUFMIP} onCheckedChange={(c) => setIncludeUFMIP(c === true)} />
                        <Label htmlFor="include-ufmip" className="cursor-pointer text-sm">Include UFMIP on FHA/VA</Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <Checkbox id="finance-ufmip" checked={financeUFMIP} onCheckedChange={(c) => setFinanceUFMIP(c === true)} />
                        <Label htmlFor="finance-ufmip" className="cursor-pointer text-sm">Finance UFMIP on FHA/VA?</Label>
                      </div>
                    </div>
                  </div>
                </div>

                {/* STEP 2 & 3: Optional Filters - Progressive Disclosure */}
                {!showOptionalFilters && (
                  <Button
                    onClick={() => setShowOptionalFilters(true)}
                    variant="outline"
                    className="w-full border-dashed border-2 border-gray-300 text-gray-600 hover:border-gray-400 hover:bg-gray-50"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add optional filters (LTV, FICO, Loan Amount, Property Type, etc.)
                  </Button>
                )}

                {showOptionalFilters && (
                  <div className="space-y-4 p-4 bg-gray-50 border border-gray-200 rounded-lg">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-sm font-semibold text-gray-700">Optional Filters (Steps 2 & 3)</h3>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowOptionalFilters(false)}
                        className="text-xs text-gray-500"
                      >
                        Hide filters
                      </Button>
                    </div>

                    {/* Borrower & Property Criteria */}
                    <Collapsible defaultOpen={false}>
                      <CollapsibleTrigger className="flex items-center justify-between w-full p-2 hover:bg-gray-100 rounded text-sm font-medium text-gray-700">
                        <span>Borrower & Property Criteria</span>
                        <ChevronRight className="h-4 w-4" />
                      </CollapsibleTrigger>
                      <CollapsibleContent className="p-3 space-y-3 text-xs text-gray-600">
                        {/* Property Types */}
                        <Collapsible>
                          <CollapsibleTrigger className="flex items-center gap-2 p-2 hover:bg-gray-100 rounded cursor-pointer">
                            <ChevronRight className="h-3 w-3" />
                            <span className="font-medium">Property Types</span>
                          </CollapsibleTrigger>
                          <CollapsibleContent className="pl-5 space-y-1 mt-1">
                            {PROPERTY_TYPES.map((type) => (
                              <div key={type} className="flex items-center gap-2">
                                <Checkbox id={`pt-${type}`} checked={selectedPropertyTypes.includes(type)} onCheckedChange={() => togglePropertyType(type)} />
                                <Label htmlFor={`pt-${type}`} className="cursor-pointer text-xs">{type}</Label>
                              </div>
                            ))}
                          </CollapsibleContent>
                        </Collapsible>

                        {/* Property Usage */}
                        <Collapsible>
                          <CollapsibleTrigger className="flex items-center gap-2 p-2 hover:bg-gray-100 rounded cursor-pointer">
                            <ChevronRight className="h-3 w-3" />
                            <span className="font-medium">Property Usage</span>
                          </CollapsibleTrigger>
                          <CollapsibleContent className="pl-5 space-y-1 mt-1">
                            {PROPERTY_USAGE.map((usage) => (
                              <div key={usage} className="flex items-center gap-2">
                                <Checkbox id={`pu-${usage}`} checked={selectedPropertyUsage.includes(usage)} onCheckedChange={() => togglePropertyUsage(usage)} />
                                <Label htmlFor={`pu-${usage}`} className="cursor-pointer text-xs">{usage}</Label>
                              </div>
                            ))}
                          </CollapsibleContent>
                        </Collapsible>

                        {/* Loan Types */}
                        <Collapsible>
                          <CollapsibleTrigger className="flex items-center gap-2 p-2 hover:bg-gray-100 rounded cursor-pointer">
                            <ChevronRight className="h-3 w-3" />
                            <span className="font-medium">Loan Types</span>
                          </CollapsibleTrigger>
                          <CollapsibleContent className="pl-5 space-y-1 mt-1">
                            {LOAN_TYPES.map((type) => (
                              <div key={type} className="flex items-center gap-2">
                                <Checkbox id={`lt-${type}`} checked={selectedLoanTypes.includes(type)} onCheckedChange={() => toggleLoanType(type)} />
                                <Label htmlFor={`lt-${type}`} className="cursor-pointer text-xs">{type}</Label>
                              </div>
                            ))}
                          </CollapsibleContent>
                        </Collapsible>

                        {/* Quoting Channels */}
                        <Collapsible>
                          <CollapsibleTrigger className="flex items-center gap-2 p-2 hover:bg-gray-100 rounded cursor-pointer">
                            <ChevronRight className="h-3 w-3" />
                            <span className="font-medium">Quoting Channels</span>
                          </CollapsibleTrigger>
                          <CollapsibleContent className="pl-5 space-y-1 mt-1">
                            {QUOTING_CHANNELS.map((channel) => (
                              <div key={channel} className="flex items-center gap-2">
                                <Checkbox id={`qc-${channel}`} checked={selectedQuotingChannels.includes(channel)} onCheckedChange={() => toggleQuotingChannel(channel)} />
                                <Label htmlFor={`qc-${channel}`} className="cursor-pointer text-xs">{channel}</Label>
                              </div>
                            ))}
                          </CollapsibleContent>
                        </Collapsible>

                        {/* States */}
                        <Collapsible>
                          <CollapsibleTrigger className="flex items-center gap-2 p-2 hover:bg-gray-100 rounded cursor-pointer">
                            <ChevronRight className="h-3 w-3" />
                            <span className="font-medium">States</span>
                          </CollapsibleTrigger>
                          <CollapsibleContent className="pl-5 space-y-1 mt-1">
                            <div className="space-y-1 max-h-40 overflow-y-auto">
                              {STATES.map((state) => (
                                <div key={state} className="flex items-center gap-2">
                                  <Checkbox id={`s-${state}`} checked={selectedStates.includes(state)} onCheckedChange={() => toggleState(state)} />
                                  <Label htmlFor={`s-${state}`} className="cursor-pointer text-xs">{state}</Label>
                                </div>
                              ))}
                            </div>
                          </CollapsibleContent>
                        </Collapsible>
                      </CollapsibleContent>
                    </Collapsible>

                    {/* Program Filters */}
                    <Collapsible>
                      <CollapsibleTrigger className="flex items-center justify-between w-full p-2 hover:bg-gray-100 rounded text-sm font-medium text-gray-700">
                        <span>Program Filters</span>
                        <ChevronRight className="h-4 w-4" />
                      </CollapsibleTrigger>
                      <CollapsibleContent className="p-3 space-y-3 text-xs text-gray-600">
                        {/* Lenders */}
                        <Collapsible>
                          <CollapsibleTrigger className="flex items-center gap-2 p-2 hover:bg-gray-100 rounded cursor-pointer">
                            <ChevronRight className="h-3 w-3" />
                            <span className="font-medium">Lenders</span>
                          </CollapsibleTrigger>
                          <CollapsibleContent className="pl-5 space-y-1 mt-1">
                            {LENDERS.map((lender) => (
                              <div key={lender} className="flex items-center gap-2">
                                <Checkbox id={`ln-${lender}`} checked={selectedLenders.includes(lender)} onCheckedChange={() => toggleLender(lender)} />
                                <Label htmlFor={`ln-${lender}`} className="cursor-pointer text-xs">{lender}</Label>
                              </div>
                            ))}
                          </CollapsibleContent>
                        </Collapsible>

                        {/* Product Families */}
                        <Collapsible>
                          <CollapsibleTrigger className="flex items-center gap-2 p-2 hover:bg-gray-100 rounded cursor-pointer">
                            <ChevronRight className="h-3 w-3" />
                            <span className="font-medium">Product Families</span>
                          </CollapsibleTrigger>
                          <CollapsibleContent className="pl-5 space-y-1 mt-1">
                            {PRODUCT_FAMILIES.map((family) => (
                              <div key={family} className="flex items-center gap-2">
                                <Checkbox id={`pf-${family}`} checked={selectedProductFamilies.includes(family)} onCheckedChange={() => toggleProductFamily(family)} />
                                <Label htmlFor={`pf-${family}`} className="cursor-pointer text-xs">{family}</Label>
                              </div>
                            ))}
                          </CollapsibleContent>
                        </Collapsible>

                        {/* Product Classes */}
                        <Collapsible>
                          <CollapsibleTrigger className="flex items-center gap-2 p-2 hover:bg-gray-100 rounded cursor-pointer">
                            <ChevronRight className="h-3 w-3" />
                            <span className="font-medium">Product Classes</span>
                          </CollapsibleTrigger>
                          <CollapsibleContent className="pl-5 space-y-1 mt-1">
                            {PRODUCT_CLASSES.map((cls) => (
                              <div key={cls} className="flex items-center gap-2">
                                <Checkbox id={`pc-${cls}`} checked={selectedProductClasses.includes(cls)} onCheckedChange={() => toggleProductClass(cls)} />
                                <Label htmlFor={`pc-${cls}`} className="cursor-pointer text-xs">{cls}</Label>
                              </div>
                            ))}
                          </CollapsibleContent>
                        </Collapsible>

                        {/* Product Types */}
                        <Collapsible>
                          <CollapsibleTrigger className="flex items-center gap-2 p-2 hover:bg-gray-100 rounded cursor-pointer">
                            <ChevronRight className="h-3 w-3" />
                            <span className="font-medium">Product Types</span>
                          </CollapsibleTrigger>
                          <CollapsibleContent className="pl-5 space-y-1 mt-1">
                            {PRODUCT_TYPES.map((type) => (
                              <div key={type} className="flex items-center gap-2">
                                <Checkbox id={`pty-${type}`} checked={selectedProductTypes.includes(type)} onCheckedChange={() => toggleProductType(type)} />
                                <Label htmlFor={`pty-${type}`} className="cursor-pointer text-xs">{type}</Label>
                              </div>
                            ))}
                          </CollapsibleContent>
                        </Collapsible>

                        {/* Product Terms */}
                        <Collapsible>
                          <CollapsibleTrigger className="flex items-center gap-2 p-2 hover:bg-gray-100 rounded cursor-pointer">
                            <ChevronRight className="h-3 w-3" />
                            <span className="font-medium">Product Terms</span>
                          </CollapsibleTrigger>
                          <CollapsibleContent className="pl-5 space-y-1 mt-1">
                            {PRODUCT_TERMS.map((term) => (
                              <div key={term} className="flex items-center gap-2">
                                <Checkbox id={`pterm-${term}`} checked={selectedProductTerms.includes(term)} onCheckedChange={() => toggleProductTerm(term)} />
                                <Label htmlFor={`pterm-${term}`} className="cursor-pointer text-xs">{term}</Label>
                              </div>
                            ))}
                          </CollapsibleContent>
                        </Collapsible>
                      </CollapsibleContent>
                    </Collapsible>
                  </div>
                )}

                {/* Schedule (Optional) */}
                <Collapsible defaultOpen={false}>
                  <CollapsibleTrigger className="flex items-center justify-between w-full p-3 rounded-lg border border-gray-200 bg-white hover:bg-gray-50">
                    <h3 className="text-sm font-medium text-gray-700">Schedule (Optional)</h3>
                    <ChevronDown className="h-4 w-4 text-gray-500" />
                  </CollapsibleTrigger>
                  <CollapsibleContent className="p-4 border border-t-0 rounded-b-lg space-y-4 bg-gray-50">
                    <div className="grid grid-cols-4 gap-4">
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

                {/* Visibility Option */}
                <div className="p-3 rounded-lg border border-gray-200 bg-white">
                  <div className="flex items-center gap-2">
                    <Checkbox id="hide-quote-adj" checked={hideInQuoteAdjustments} onCheckedChange={(c) => setHideInQuoteAdjustments(c === true)} />
                    <Label htmlFor="hide-quote-adj" className="text-sm cursor-pointer">Hide in quote adjustments</Label>
                  </div>
                </div>
              </TabsContent>
