import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchProducts } from '../../api/productApi';
import { useSizesQuery } from '../../hooks/useSizes';
import { useCostSheetQuery } from '../../hooks/useReports';
import Loader from '../../components/common/Loader';
import { formatCurrency } from '../../utils/formatCurrency';

export default function CostSheet() {
  const [fgSku,    setFgSku]    = useState('');
  const [sizeCode, setSizeCode] = useState('');

  const { data: prodsData } = useQuery({
    queryKey: ['products'],
    queryFn:  () => fetchProducts({ limit: 500 }),
  });
  const { data: sizesRes } = useSizesQuery({ is_active: 'true', limit: 100 });

  // prodsData is the full Axios-style response from fetchProducts — keep existing access pattern
  const fgProducts  = Array.isArray(prodsData?.data?.data)
    ? prodsData.data.data.filter(p => p?.product_type === 'FINISHED')
    : Array.isArray(prodsData?.data)
      ? prodsData.data.filter(p => p?.product_type === 'FINISHED')
      : [];
  const activeSizes = Array.isArray(sizesRes?.data) ? sizesRes.data : [];

  // queryFn returns the unwrapped data object with safe fallback { costSheet: {} }
  const { data, isLoading } = useCostSheetQuery(fgSku, sizeCode ? { size_code: sizeCode } : {});

  const costSheet = data?.costSheet ?? {};
  const product   = data?.product   ?? {};
  const bySize    = (costSheet?.bySize && typeof costSheet.bySize === 'object')
    ? costSheet.bySize
    : {};

  const handleExport = () => {
    window.location.href = '/api/export/cost-sheet/excel';
  };

  return (
    <div className="space-y-6">
      {/* Filter Bar */}
      <div className="card p-4 flex flex-wrap items-end gap-4 justify-between bg-white border border-gray-200">
        <div className="flex items-center gap-4">
          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1 block">Finished Product *</label>
            <select
              className="input-field py-1.5 min-w-[250px]"
              value={fgSku}
              onChange={e => setFgSku(e.target.value)}
            >
              <option value="">— Select Product —</option>
              {fgProducts.map(p => (
                <option key={p.sku_code} value={p.sku_code}>
                  {p.sku_code} - {p.description}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1 block">Size Override</label>
            <select
              className="input-field py-1.5 min-w-[150px]"
              value={sizeCode}
              onChange={e => setSizeCode(e.target.value)}
            >
              <option value="">All Sizes</option>
              {activeSizes.map(s => (
                <option key={s.size_code} value={s.size_code}>{s.size_label}</option>
              ))}
            </select>
          </div>
        </div>
        <button onClick={handleExport} className="btn-secondary text-sm">
          Export All Products (Excel)
        </button>
      </div>

      {isLoading && fgSku && <Loader />}

      {!isLoading && fgSku && Object.keys(bySize).length > 0 && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="card p-5 bg-gradient-to-br from-blue-900 to-indigo-900 text-white flex flex-col justify-center shadow-lg">
              <p className="text-xs font-bold text-blue-300 uppercase tracking-widest">Selected Product</p>
              <p className="text-xl font-black mt-1 leading-tight">{product?.sku ?? fgSku}</p>
              <p className="text-sm text-blue-100">{product?.description ?? ''}</p>
            </div>
            <div className="card p-5 bg-white border border-gray-100 flex flex-col justify-center">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Average Cost / Size</p>
              <p className="text-3xl font-black mt-2 tabular-nums text-gray-800">
                {formatCurrency(costSheet?.averageCost ?? 0)}
              </p>
            </div>
            <div className="card p-4 bg-white border border-gray-100 grid grid-cols-2 gap-2">
              <div className="flex flex-col justify-center">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Lowest Cost Bound</p>
                <p className="text-lg font-black tabular-nums text-green-600 mt-1">
                  {formatCurrency(costSheet?.lowestCost?.value ?? 0)}{' '}
                  <span className="text-xs font-semibold text-gray-400">({costSheet?.lowestCost?.size ?? '-'})</span>
                </p>
              </div>
              <div className="flex flex-col justify-center">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Highest Cost Bound</p>
                <p className="text-lg font-black tabular-nums text-red-600 mt-1">
                  {formatCurrency(costSheet?.highestCost?.value ?? 0)}{' '}
                  <span className="text-xs font-semibold text-gray-400">({costSheet?.highestCost?.size ?? '-'})</span>
                </p>
              </div>
            </div>
          </div>

          {/* Per-size breakdown tables */}
          <div className="grid grid-cols-1 gap-6">
            {Object.entries(bySize).map(([size, dt]) => {
              const breakdown = Array.isArray(dt?.materialBreakdown) ? dt.materialBreakdown : [];
              return (
                <div key={size} className="card p-0 overflow-hidden border border-gray-200">
                  <div className="px-5 py-4 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
                    <h3 className="text-sm font-bold text-gray-700 uppercase">Cost Pivot: {size}</h3>
                    <span className="font-mono font-bold text-lg text-blue-700">
                      {formatCurrency(dt?.materialCost ?? 0)}
                    </span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr>
                          <th className="px-5 py-2 text-left font-semibold text-gray-500">Component SKU</th>
                          <th className="px-5 py-2 text-left font-semibold text-gray-500">Description</th>
                          <th className="px-5 py-2 text-right font-semibold text-gray-500 border-x border-gray-100 bg-gray-50/50">Consume Qty</th>
                          <th className="px-5 py-2 text-right font-semibold text-gray-500">Rate (₹)</th>
                          <th className="px-5 py-2 text-right font-semibold text-gray-500">Total Val (₹)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {breakdown.map((m, i) => (
                          <tr key={i} className="border-t border-gray-100 hover:bg-gray-50/50 transition-colors">
                            <td className="px-5 py-2 font-mono font-semibold text-gray-700">{m?.sku  ?? '-'}</td>
                            <td className="px-5 py-2 text-gray-600 line-clamp-1">{m?.desc ?? '-'}</td>
                            <td className="px-5 py-2 text-right tabular-nums font-bold text-blue-800 bg-blue-50/20 border-x border-blue-50">
                              {Number(m?.qty   ?? 0).toFixed(4)}
                            </td>
                            <td className="px-5 py-2 text-right tabular-nums text-gray-500">
                              {Number(m?.rate  ?? 0).toFixed(2)}
                            </td>
                            <td className="px-5 py-2 text-right tabular-nums font-bold text-gray-800">
                              {Number(m?.value ?? 0).toFixed(2)}
                            </td>
                          </tr>
                        ))}
                        {breakdown.length === 0 && (
                          <tr>
                            <td colSpan={5} className="px-5 py-4 text-center text-gray-400">No components.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {!isLoading && !fgSku && (
        <div className="py-20 text-center border-2 border-dashed border-gray-200 rounded-xl bg-gray-50/50">
          <p className="text-gray-400 font-medium">
            Select a Finished Product to view its multi-size Cost Sheet.
          </p>
        </div>
      )}

      {!isLoading && fgSku && Object.keys(bySize).length === 0 && (
        <div className="py-20 text-center border-2 border-dashed border-gray-200 rounded-xl bg-gray-50/50">
          <p className="text-gray-400 font-medium">
            No cost sheet data found for <strong>{fgSku}</strong>.
          </p>
        </div>
      )}
    </div>
  );
}
