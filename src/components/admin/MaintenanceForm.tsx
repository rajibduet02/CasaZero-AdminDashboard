import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { X, Wrench, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Label } from '../ui/label';
import { Card } from '../ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { useLanguage } from '../../utils/LanguageContext';

interface MaintenanceFormProps {
  maintenance?: any;
  onClose: () => void;
  onSave: (maintenance: any) => void;
  loading?: boolean;
}

// Mock data for dropdowns
const mockCategories = [
  { id: 1, name: 'HVAC' },
  { id: 2, name: 'Safety' },
  { id: 3, name: 'Mechanical' },
  { id: 4, name: 'Plumbing' },
  { id: 5, name: 'Access Control' },
  { id: 6, name: 'Cleaning' },
  { id: 7, name: 'Electrical' },
  { id: 8, name: 'Structural' },
];

const mockItems = [
  { id: 1, name: 'Air Filter' },
  { id: 2, name: 'Fire Extinguisher' },
  { id: 3, name: 'Elevator' },
  { id: 4, name: 'Boiler' },
  { id: 5, name: 'Parking Gate' },
  { id: 6, name: 'Windows' },
  { id: 7, name: 'Lighting' },
  { id: 8, name: 'Water Heater' },
];

const mockResidences = [
  { id: 1, residence_name: 'Residenza Verde' },
  { id: 2, residence_name: 'Palazzo Moderno' },
  { id: 3, residence_name: 'Villa Serena' },
];

const mockUnits = [
  { id: 1, unit_name: 'Unit A1', residence_id: 1 },
  { id: 2, unit_name: 'Unit B2', residence_id: 1 },
  { id: 3, unit_name: 'Unit C3', residence_id: 2 },
  { id: 4, unit_name: 'Unit D4', residence_id: 2 },
  { id: 5, unit_name: 'Unit E5', residence_id: 3 },
];

const mockUsers = [
  { id: 1, name: 'Marco Rossi' },
  { id: 2, name: 'Luigi Bianchi' },
  { id: 3, name: 'Giuseppe Verdi' },
  { id: 4, name: 'Anna Romano' },
  { id: 5, name: 'Sofia Colombo' },
];

const frequencyOptions = [
  { value: 'Weekly', label: 'Weekly' },
  { value: 'Monthly', label: 'Monthly' },
  { value: 'Quarterly', label: 'Quarterly' },
  { value: 'Bi-annually', label: 'Bi-annually' },
  { value: 'Annually', label: 'Annually' },
];

export function MaintenanceForm({ maintenance, onClose, onSave, loading }: MaintenanceFormProps) {
  const { t } = useLanguage();
  const isEditMode = !!maintenance;

  // Form state
  const [formData, setFormData] = useState({
    maintenance_title: '',
    maintenance_note: '',
    category_id: '',
    item_id: '',
    maintenance_frequency: '',
    due_date: '',
    residence_id: '',
    unit_id: '',
    assigned_user_id: '',
  });

  // Dropdown data
  const [categories] = useState(mockCategories);
  const [items] = useState(mockItems);
  const [residences] = useState(mockResidences);
  const [units, setUnits] = useState(mockUnits);
  const [users] = useState(mockUsers);

  // Validation state
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Load maintenance data if editing
  useEffect(() => {
    if (maintenance) {
      console.log('📝 [MAINTENANCE-FORM] Loading maintenance for editing:', maintenance);
      setFormData({
        maintenance_title: maintenance.maintenance_title || '',
        maintenance_note: maintenance.maintenance_note || '',
        category_id: maintenance.category?.id?.toString() || '',
        item_id: maintenance.item?.id?.toString() || '',
        maintenance_frequency: maintenance.maintenance_frequency || '',
        due_date: maintenance.due_date || '',
        residence_id: maintenance.residence?.id?.toString() || '',
        unit_id: maintenance.unit?.id?.toString() || '',
        assigned_user_id: maintenance.assigned_user?.id?.toString() || '',
      });
    }
  }, [maintenance]);

  // Filter units based on selected residence
  useEffect(() => {
    if (formData.residence_id) {
      const filtered = mockUnits.filter(u => u.residence_id === parseInt(formData.residence_id));
      setUnits(filtered);
      // Clear unit selection if it doesn't belong to the new residence
      if (formData.unit_id && !filtered.find(u => u.id === parseInt(formData.unit_id))) {
        setFormData(prev => ({ ...prev, unit_id: '' }));
      }
    } else {
      setUnits(mockUnits);
    }
  }, [formData.residence_id]);

  // Handle input changes
  const handleInputChange = (field: string, value: any) => {
    console.log(`📝 [FORM-CHANGE] Field: ${field}, Value:`, value);
    
    // Clear unit selection when residence changes
    if (field === 'residence_id') {
      setFormData(prev => ({ 
        ...prev, 
        residence_id: value,
        unit_id: '' // Clear unit when residence changes
      }));
    } else {
      setFormData(prev => ({ ...prev, [field]: value }));
    }
    
    // Clear error for this field
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  // Validate form
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.maintenance_title.trim()) {
      newErrors.maintenance_title = t('maintenanceTitleRequired');
    }

    if (!formData.category_id) {
      newErrors.category_id = t('categoryRequired');
    }

    if (!formData.maintenance_frequency) {
      newErrors.maintenance_frequency = t('frequencyRequired');
    }

    if (!formData.due_date) {
      newErrors.due_date = t('dueDateRequired');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    console.log('=== MAINTENANCE FORM SUBMIT ===');
    console.log('Is Edit Mode:', isEditMode);
    console.log('Form Data:', formData);

    if (!validateForm()) {
      console.log('❌ Validation failed:', errors);
      return;
    }

    // Prepare data for submission
    const maintenanceData = {
      ...formData,
      id: maintenance?.id,
      category_id: parseInt(formData.category_id) || null,
      item_id: formData.item_id ? parseInt(formData.item_id) : null,
      residence_id: formData.residence_id ? parseInt(formData.residence_id) : null,
      unit_id: formData.unit_id ? parseInt(formData.unit_id) : null,
      assigned_user_id: formData.assigned_user_id ? parseInt(formData.assigned_user_id) : null,
      // Map the IDs to objects for display purposes
      category: formData.category_id ? categories.find(c => c.id === parseInt(formData.category_id)) : null,
      item: formData.item_id ? items.find(i => i.id === parseInt(formData.item_id)) : null,
      residence: formData.residence_id ? residences.find(r => r.id === parseInt(formData.residence_id)) : null,
      unit: formData.unit_id ? units.find(u => u.id === parseInt(formData.unit_id)) : null,
      assigned_user: formData.assigned_user_id ? users.find(u => u.id === parseInt(formData.assigned_user_id)) : null,
      maintenance_status: maintenance?.maintenance_status || 'pending',
    };

    console.log('📤 Submitting maintenance data:', maintenanceData);
    onSave(maintenanceData);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 20 }}
        transition={{ duration: 0.3 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-3xl max-h-[90vh] overflow-y-auto"
      >
        <Card className="p-8 rounded-3xl bg-white shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-neutral-ink-900 mb-1">
                {isEditMode ? t('editMaintenance') : t('createMaintenance')}
              </h2>
              <p className="text-sm text-neutral-ink-500">
                {isEditMode ? t('updateMaintenanceInfo') : t('addNewMaintenance')}
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="rounded-full w-10 h-10 p-0 hover:bg-neutral-line-200"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Maintenance Title */}
            <div className="space-y-2">
              <Label htmlFor="maintenance_title" className="text-neutral-ink-700">
                {t('maintenanceTitle')} <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2">
                  <Wrench className="w-5 h-5 text-neutral-ink-400" />
                </div>
                <Input
                  id="maintenance_title"
                  type="text"
                  value={formData.maintenance_title}
                  onChange={(e) => handleInputChange('maintenance_title', e.target.value)}
                  placeholder={t('enterMaintenanceTitle')}
                  className="pl-10 rounded-xl border-neutral-line-200 focus:border-[#6A8F7B]"
                />
              </div>
              {errors.maintenance_title && (
                <div className="flex items-center gap-2 text-red-600 text-sm mt-2">
                  <AlertCircle className="w-4 h-4" />
                  <span>{errors.maintenance_title}</span>
                </div>
              )}
            </div>

            {/* Maintenance Note */}
            <div className="space-y-2">
              <Label htmlFor="maintenance_note" className="text-neutral-ink-700">
                {t('maintenanceNote')}
              </Label>
              <Textarea
                id="maintenance_note"
                value={formData.maintenance_note}
                onChange={(e) => handleInputChange('maintenance_note', e.target.value)}
                placeholder={t('enterMaintenanceNote')}
                className="rounded-xl border-neutral-line-200 focus:border-[#6A8F7B] min-h-[100px]"
              />
            </div>

            {/* Category and Item - Side by Side */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Category */}
              <div className="space-y-2">
                <Label htmlFor="category_id" className="text-neutral-ink-700">
                  {t('category')} <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={formData.category_id}
                  onValueChange={(value) => handleInputChange('category_id', value)}
                >
                  <SelectTrigger className="rounded-xl border-neutral-line-200 focus:border-[#6A8F7B]">
                    <SelectValue placeholder={t('selectCategory')} />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    {categories.map((category) => (
                      <SelectItem
                        key={category.id}
                        value={category.id.toString()}
                        className="rounded-lg"
                      >
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.category_id && (
                  <div className="flex items-center gap-2 text-red-600 text-sm mt-2">
                    <AlertCircle className="w-4 h-4" />
                    <span>{errors.category_id}</span>
                  </div>
                )}
              </div>

              {/* Item */}
              <div className="space-y-2">
                <Label htmlFor="item_id" className="text-neutral-ink-700">
                  {t('item')}
                </Label>
                <Select
                  value={formData.item_id}
                  onValueChange={(value) => handleInputChange('item_id', value)}
                >
                  <SelectTrigger className="rounded-xl border-neutral-line-200 focus:border-[#6A8F7B]">
                    <SelectValue placeholder={t('selectItem')} />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    {items.map((item) => (
                      <SelectItem
                        key={item.id}
                        value={item.id.toString()}
                        className="rounded-lg"
                      >
                        {item.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Frequency and Due Date - Side by Side */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Frequency */}
              <div className="space-y-2">
                <Label htmlFor="maintenance_frequency" className="text-neutral-ink-700">
                  {t('frequency')} <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={formData.maintenance_frequency}
                  onValueChange={(value) => handleInputChange('maintenance_frequency', value)}
                >
                  <SelectTrigger className="rounded-xl border-neutral-line-200 focus:border-[#6A8F7B]">
                    <SelectValue placeholder={t('selectFrequency')} />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    {frequencyOptions.map((option) => (
                      <SelectItem
                        key={option.value}
                        value={option.value}
                        className="rounded-lg"
                      >
                        {t(option.value.toLowerCase()) || option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.maintenance_frequency && (
                  <div className="flex items-center gap-2 text-red-600 text-sm mt-2">
                    <AlertCircle className="w-4 h-4" />
                    <span>{errors.maintenance_frequency}</span>
                  </div>
                )}
              </div>

              {/* Due Date */}
              <div className="space-y-2">
                <Label htmlFor="due_date" className="text-neutral-ink-700">
                  {t('dueDate')} <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="due_date"
                  type="date"
                  value={formData.due_date}
                  onChange={(e) => handleInputChange('due_date', e.target.value)}
                  className="rounded-xl border-neutral-line-200 focus:border-[#6A8F7B]"
                />
                {errors.due_date && (
                  <div className="flex items-center gap-2 text-red-600 text-sm mt-2">
                    <AlertCircle className="w-4 h-4" />
                    <span>{errors.due_date}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Residence and Unit - Side by Side */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Residence */}
              <div className="space-y-2">
                <Label htmlFor="residence_id" className="text-neutral-ink-700">
                  {t('residence')}
                </Label>
                <Select
                  value={formData.residence_id}
                  onValueChange={(value) => handleInputChange('residence_id', value)}
                >
                  <SelectTrigger className="rounded-xl border-neutral-line-200 focus:border-[#6A8F7B]">
                    <SelectValue placeholder={t('selectResidence')} />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    {residences.map((residence) => (
                      <SelectItem
                        key={residence.id}
                        value={residence.id.toString()}
                        className="rounded-lg"
                      >
                        {residence.residence_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Unit */}
              <div className="space-y-2">
                <Label htmlFor="unit_id" className="text-neutral-ink-700">
                  {t('unit')}
                </Label>
                <Select
                  value={formData.unit_id}
                  onValueChange={(value) => handleInputChange('unit_id', value)}
                  disabled={!formData.residence_id}
                >
                  <SelectTrigger className={`rounded-xl border-neutral-line-200 focus:border-[#6A8F7B] ${!formData.residence_id ? 'opacity-50' : ''}`}>
                    <SelectValue placeholder={formData.residence_id ? t('selectUnit') : t('selectResidenceFirst')} />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    {units.map((unit) => (
                      <SelectItem
                        key={unit.id}
                        value={unit.id.toString()}
                        className="rounded-lg"
                      >
                        {unit.unit_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Assigned User */}
            <div className="space-y-2">
              <Label htmlFor="assigned_user_id" className="text-neutral-ink-700">
                {t('assignedTo')}
              </Label>
              <Select
                value={formData.assigned_user_id}
                onValueChange={(value) => handleInputChange('assigned_user_id', value)}
              >
                <SelectTrigger className="rounded-xl border-neutral-line-200 focus:border-[#6A8F7B]">
                  <SelectValue placeholder={t('selectAssignedUser')} />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  {users.map((user) => (
                    <SelectItem
                      key={user.id}
                      value={user.id.toString()}
                      className="rounded-lg"
                    >
                      {user.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4 border-t border-neutral-line-200">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={loading}
                className="flex-1 rounded-xl border-neutral-line-200 hover:bg-neutral-line-100"
              >
                {t('cancel')}
              </Button>
              <Button
                type="submit"
                disabled={loading}
                className="flex-1 bg-gradient-to-r from-[#6A8F7B] to-[#5a7a68] text-white hover:opacity-90 transition-all duration-300 rounded-xl shadow-lg"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {t('saving')}
                  </>
                ) : (
                  <>{isEditMode ? t('updateMaintenance') : t('createMaintenance')}</>
                )}
              </Button>
            </div>
          </form>
        </Card>
      </motion.div>
    </motion.div>
  );
}

