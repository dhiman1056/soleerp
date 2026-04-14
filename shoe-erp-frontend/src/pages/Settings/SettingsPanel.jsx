import React, { useState, useEffect } from 'react';
import { useAllSettingsQuery, useUpdateSettings } from '../../hooks/useSettings';
import Loader from '../../components/common/Loader';
import toast from 'react-hot-toast';

/**
 * Returns the settings rows for `groupKey` as an array,
 * whether the API returned that group as an array or an object-of-objects.
 */
function getFields(data, groupKey) {
  const group = data?.[groupKey];
  if (!group) return [];
  if (Array.isArray(group)) return group;
  if (typeof group === 'object') return Object.values(group);
  return [];
}

/**
 * Shared settings editor panel.
 * Props:
 *   groupKey  – e.g. 'COMPANY'
 *   title     – section heading shown above the grid
 */
export default function SettingsPanel({ groupKey, title }) {
  const { data, isLoading } = useAllSettingsQuery();
  const updateMut = useUpdateSettings();
  const [form, setForm] = useState({});

  const fields = getFields(data, groupKey);

  // Seed form when data loads
  useEffect(() => {
    if (!fields.length) return;
    const init = {};
    fields.forEach(s => { if (s?.setting_key) init[s.setting_key] = s.setting_value ?? ''; });
    setForm(init);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  if (isLoading) return <Loader />;

  const handleSave = (e) => {
    e.preventDefault();
    const updates = Object.keys(form).map(k => ({ key: k, value: form[k] }));
    updateMut.mutate(updates, {
      onSuccess: () => toast.success(`${title} settings saved.`),
    });
  };

  return (
    <form onSubmit={handleSave} className="space-y-6">
      {title && (
        <h2 className="text-base font-bold text-gray-700 uppercase tracking-wide">
          {title}
        </h2>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
        {fields.length === 0 && (
          <p className="col-span-2 text-center text-gray-400 text-sm py-6">
            No configuration fields found for this group.
          </p>
        )}
        {fields.map(setting => {
          const key = setting?.setting_key ?? '';
          const val = String(setting?.setting_value ?? '');
          const isBool = val === 'true' || val === 'false';
          const current = form[key] ?? val;
          return (
            <div key={key} className="flex flex-col">
              <label className="text-xs font-bold text-gray-700 mb-1">
                {key.replace(/_/g, ' ').toUpperCase()}
              </label>
              {isBool ? (
                <select
                  className="input-field max-w-sm mt-1"
                  value={current}
                  onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                >
                  <option value="true">True / Enabled</option>
                  <option value="false">False / Disabled</option>
                </select>
              ) : (
                <input
                  type="text"
                  className="input-field mt-1"
                  value={current}
                  onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                />
              )}
              {setting?.description && (
                <p className="text-[10px] text-gray-400 mt-1">{setting.description}</p>
              )}
            </div>
          );
        })}
      </div>

      <div className="pt-6 border-t border-gray-100 flex justify-end">
        <button
          type="submit"
          disabled={updateMut.isPending}
          className="btn-primary px-10 shadow shadow-blue-200"
        >
          {updateMut.isPending ? 'Saving…' : 'Save Configuration'}
        </button>
      </div>
    </form>
  );
}
