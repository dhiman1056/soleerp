import React, { useState, useEffect } from 'react';
import { useAllSettingsQuery, useUpdateSettings } from '../../hooks/useSettings';
import { useAuth } from '../../hooks/useAuth';
import Loader from '../../components/common/Loader';
import toast from 'react-hot-toast';

// ─── helpers ─────────────────────────────────────────────────────────────────

/**
 * `data` from the hook is now the unwrapped value — could be:
 *   - { COMPANY: [...], FINANCIAL: [...] }  (arrays per group)
 *   - { COMPANY: { key: {...}, ... } }      (objects per group)
 *   - undefined / null on first load
 * Return a flat key→value map for the form.
 */
function buildFormMap(data) {
  if (!data || typeof data !== 'object') return {};
  const mapper = {};
  for (const group of Object.values(data)) {
    if (Array.isArray(group)) {
      group.forEach(s => { if (s?.setting_key) mapper[s.setting_key] = s.setting_value ?? ''; });
    } else if (group && typeof group === 'object') {
      Object.values(group).forEach(s => { if (s?.setting_key) mapper[s.setting_key] = s.setting_value ?? ''; });
    }
  }
  return mapper;
}

/**
 * Return the settings array for a given tab, regardless of whether the API
 * returned that group as an array or as an object-of-objects.
 */
function getGroupFields(data, groupKey) {
  const group = data?.[groupKey];
  if (!group) return [];
  if (Array.isArray(group)) return group;
  if (typeof group === 'object') return Object.values(group);
  return [];
}

const TABS = ['COMPANY', 'FINANCIAL', 'INVENTORY', 'NOTIFICATION'];

// ─── component ───────────────────────────────────────────────────────────────

export default function Settings() {
  const { user } = useAuth();
  const { data, isLoading } = useAllSettingsQuery();
  const updateMut = useUpdateSettings();

  const [activeTab, setActiveTab] = useState('COMPANY');
  const [form, setForm] = useState({});

  useEffect(() => {
    if (data) setForm(buildFormMap(data));
  }, [data]);

  if (!['admin', 'manager'].includes(user?.role)) {
    return (
      <div className="p-8 text-center text-gray-500">
        You do not have permission to access Settings.
      </div>
    );
  }

  if (isLoading) return <Loader />;

  const handleSave = (e) => {
    e.preventDefault();
    const updates = Object.keys(form).map(k => ({ key: k, value: form[k] }));
    updateMut.mutate(updates, {
      onSuccess: () => toast.success('Settings saved successfully.'),
    });
  };

  const fields = getGroupFields(data, activeTab);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">System Settings</h1>

      <div className="card overflow-hidden">
        {/* Tab bar */}
        <div className="flex border-b border-gray-100 bg-gray-50/50 overflow-x-auto">
          {TABS.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-3 text-sm font-semibold border-b-2 whitespace-nowrap transition-colors ${
                activeTab === tab
                  ? 'border-gray-900 text-gray-900 bg-white'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              {tab.charAt(0) + tab.slice(1).toLowerCase()} Settings
            </button>
          ))}
        </div>

        <form onSubmit={handleSave} className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
            {fields.length === 0 && (
              <p className="text-gray-400 col-span-2 text-sm text-center py-6">
                No settings found for this group.
              </p>
            )}
            {fields.map(setting => {
              const key = setting?.setting_key ?? '';
              const val = String(setting?.setting_value ?? '');
              const isBool = val === 'true' || val === 'false';
              return (
                <div key={key} className="flex flex-col">
                  <label className="text-xs font-bold text-gray-700 mb-1">
                    {key.replace(/_/g, ' ').toUpperCase()}
                  </label>
                  {isBool ? (
                    <select
                      className="input-field max-w-sm mt-1"
                      value={form[key] ?? val}
                      onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                    >
                      <option value="true">True / Enabled</option>
                      <option value="false">False / Disabled</option>
                    </select>
                  ) : (
                    <input
                      type="text"
                      className="input-field mt-1"
                      value={form[key] ?? val}
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

          <div className="mt-8 pt-6 border-t border-gray-100 flex justify-end">
            <button
              type="submit"
              disabled={updateMut.isPending}
              className="btn-primary w-full md:w-auto px-10 shadow shadow-blue-200"
            >
              {updateMut.isPending ? 'Saving…' : 'Save Configuration'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
