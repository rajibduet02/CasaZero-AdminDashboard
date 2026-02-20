import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Upload, File, Loader2, AlertCircle, Home, Building2 } from 'lucide-react';
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

interface DocumentFormProps {
  document?: any;
  onClose: () => void;
  onSave: (document: any) => void;
  loading?: boolean;
  prefilledData?: {
    residence_id?: number;
    residence_name?: string;
    unit_id?: number;
    unit_name?: string;
  } | null;
}

interface Category {
  id: number;
  category_name: string;
  category_description?: string;
  created_at?: string;
  updated_at?: string;
}

interface DocumentType {
  id: number;
  type_name: string;
  type_description?: string;
  created_at?: string;
  updated_at?: string;
}

interface Residence {
  id: number;
  residence_name: string;
}

interface Unit {
  id: number;
  name: string;
}

export function DocumentForm({ document, onClose, onSave, loading, prefilledData }: DocumentFormProps) {
  const { t } = useLanguage();
  const isEditMode = !!document;

  // Form state
  const [formData, setFormData] = useState({
    document_name: '',
    document_description: '',
    file_url: '',
    file_type: '',
    file_size: 0,
    category_id: '',
    type_id: '',
    residence_id: '',
    unit_id: '',
  });

  // File upload state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string>('');

  // Dropdown data
  const [categories, setCategories] = useState<Category[]>([]);
  const [types, setTypes] = useState<DocumentType[]>([]);
  const [residences, setResidences] = useState<Residence[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);

  // Loading states
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [loadingTypes, setLoadingTypes] = useState(false);
  const [loadingResidences, setLoadingResidences] = useState(false);
  const [loadingUnits, setLoadingUnits] = useState(false);

  // Validation state
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Load document data if editing
  useEffect(() => {
    if (document) {
      console.log('📝 [DOCUMENT-FORM] Loading document for editing:', document);
      setFormData({
        document_name: document.document_name || '',
        document_description: document.document_description || '',
        file_url: document.file_url || '',
        file_type: document.file_type || '',
        file_size: document.file_size || 0,
        category_id: document.category_id?.toString() || '',
        type_id: document.type_id?.toString() || '',
        residence_id: document.residence_id?.toString() || '',
        unit_id: document.unit_id?.toString() || '',
      });
      setFilePreview(document.file_url || '');
    }
  }, [document]);

  // Handle prefilled data from units page
  useEffect(() => {
    if (prefilledData && !document) {
      console.log('📝 [DOCUMENT-FORM] Loading prefilled data from units page:', prefilledData);
      setFormData(prev => ({
        ...prev,
        residence_id: prefilledData.residence_id?.toString() || '',
        unit_id: prefilledData.unit_id?.toString() || '',
      }));
    }
  }, [prefilledData, document]);

  // Fetch categories
  useEffect(() => {
    const fetchCategories = async () => {
      setLoadingCategories(true);
      try {
        console.log('📂 [CATEGORIES] Fetching categories from API...');
        console.log('📂 [CATEGORIES] API URL: https://smarthome.attoexasolutions.com/api/document_categories');
        
        const response = await fetch('https://smarthome.attoexasolutions.com/api/document_categories');
        const result = await response.json();
        
        console.log('📂 [CATEGORIES] API Response:', result);
        console.log('📂 [CATEGORIES] Response Status:', result.status);
        console.log('📂 [CATEGORIES] Response Data:', result.data);
        
        if (result.status && result.data) {
          console.log('✅ [CATEGORIES] Successfully loaded', result.data.length, 'categories from API');
          console.log('📂 [CATEGORIES] Categories:', result.data.map((cat: Category) => ({
            id: cat.id,
            name: cat.category_name,
            description: cat.category_description
          })));
          setCategories(result.data);
        } else {
          console.warn('⚠️ [CATEGORIES] API returned status false or no data');
          setCategories([]);
        }
      } catch (error) {
        console.error('❌ [CATEGORIES] Error fetching categories:', error);
        console.error('❌ [CATEGORIES] Error details:', {
          name: error instanceof Error ? error.name : 'Unknown',
          message: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        });
        // Set empty array on error
        setCategories([]);
      } finally {
        setLoadingCategories(false);
        console.log('📂 [CATEGORIES] Fetch completed');
      }
    };

    fetchCategories();
  }, []);

  // Fetch types
  useEffect(() => {
    const fetchTypes = async () => {
      setLoadingTypes(true);
      try {
        console.log('📋 [TYPES] Fetching document types from API...');
        console.log('📋 [TYPES] API URL: https://smarthome.attoexasolutions.com/api/document_types');
        
        const response = await fetch('https://smarthome.attoexasolutions.com/api/document_types');
        const result = await response.json();
        
        console.log('📋 [TYPES] API Response:', result);
        console.log('📋 [TYPES] Response Status:', result.status);
        console.log('📋 [TYPES] Response Data:', result.data);
        
        if (result.status && result.data) {
          console.log('✅ [TYPES] Successfully loaded', result.data.length, 'document types from API');
          console.log('📋 [TYPES] Types:', result.data.map((type: DocumentType) => ({
            id: type.id,
            name: type.type_name,
            description: type.type_description
          })));
          setTypes(result.data);
        } else {
          console.warn('⚠️ [TYPES] API returned status false or no data');
          setTypes([]);
        }
      } catch (error) {
        console.error('❌ [TYPES] Error fetching document types:', error);
        console.error('❌ [TYPES] Error details:', {
          name: error instanceof Error ? error.name : 'Unknown',
          message: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        });
        // Set empty array on error
        setTypes([]);
      } finally {
        setLoadingTypes(false);
        console.log('📋 [TYPES] Fetch completed');
      }
    };

    fetchTypes();
  }, []);

  // Fetch residences
  useEffect(() => {
    const fetchResidences = async () => {
      setLoadingResidences(true);
      try {
        console.log('🏢 [RESIDENCES] Fetching all residences for document assignment...');
        console.log('🏢 [RESIDENCES] API URL: https://smarthome.attoexasolutions.com/api/residences');
        
        const response = await fetch('https://smarthome.attoexasolutions.com/api/residences', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
        });
        
        console.log('🏢 [RESIDENCES] Response Status Code:', response.status);
        console.log('🏢 [RESIDENCES] Response OK:', response.ok);
        
        const result = await response.json();
        
        console.log('🏢 [RESIDENCES] API Response:', result);
        console.log('🏢 [RESIDENCES] Response Status:', result.status);
        console.log('🏢 [RESIDENCES] Response Message:', result.message);
        console.log('🏢 [RESIDENCES] Response Data:', result.data);
        console.log('🏢 [RESIDENCES] Data Length:', result.data?.length);
        
        if (result.status && result.data && Array.isArray(result.data)) {
          console.log('✅ [RESIDENCES] Successfully loaded', result.data.length, 'residences from API');
          console.log('🏢 [RESIDENCES] Residences:', result.data.map((res: any) => ({
            id: res.id,
            name: res.residence_name
          })));
          setResidences(result.data);
        } else {
          console.warn('⚠️ [RESIDENCES] API returned status false or no data');
          console.warn('⚠️ [RESIDENCES] Status:', result.status);
          console.warn('⚠️ [RESIDENCES] Data:', result.data);
          setResidences([]);
        }
      } catch (error) {
        console.error('❌ [RESIDENCES] Error fetching residences:', error);
        console.error('❌ [RESIDENCES] Error details:', {
          name: error instanceof Error ? error.name : 'Unknown',
          message: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        });
        // Set empty array on error
        setResidences([]);
      } finally {
        setLoadingResidences(false);
        console.log('🏢 [RESIDENCES] Fetch completed. Total residences loaded:', residences.length);
      }
    };

    console.log('🏢 [RESIDENCES] useEffect triggered - Starting residence fetch...');
    fetchResidences();
  }, []);

  // Fetch units based on selected residence
  useEffect(() => {
    console.log('🔄 [UNITS-EFFECT] useEffect triggered!')
    console.log('🔄 [UNITS-EFFECT] Current residence_id:', formData.residence_id);
    console.log('🔄 [UNITS-EFFECT] residence_id type:', typeof formData.residence_id);
    console.log('🔄 [UNITS-EFFECT] residence_id is empty?', !formData.residence_id);
    
    const fetchUnits = async () => {
      if (!formData.residence_id) {
        console.log('⚠️ [UNITS-EFFECT] No residence selected, clearing units...');
        setUnits([]);
        return;
      }

      setLoadingUnits(true);
      console.log('🏠 [UNITS] Starting fetch for residence:', formData.residence_id);
      
      try {
        console.log('🏠 [UNITS] Fetching units for residence:', formData.residence_id);
        
        const requestBody = { residence_id: parseInt(formData.residence_id) };
        console.log('📤 [UNITS] Request Body:', requestBody);
        console.log('📤 [UNITS] API URL: https://smarthome.attoexasolutions.com/api/unit_by_residence');
        
        const response = await fetch('https://smarthome.attoexasolutions.com/api/unit_by_residence', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          body: JSON.stringify(requestBody),
        });
        
        console.log('📡 [UNITS] Response Status Code:', response.status);
        console.log('📡 [UNITS] Response OK:', response.ok);
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        console.log('📥 [UNITS] Full API Response:', result);
        console.log('📥 [UNITS] Response Status:', result.status);
        console.log('📥 [UNITS] Response Message:', result.message);
        console.log('📥 [UNITS] Response Residence:', result.residence);
        console.log('📥 [UNITS] Response Units:', result.units);
        
        if (result.status && result.units && Array.isArray(result.units)) {
          console.log('✅ [UNITS] Loaded', result.units.length, 'units for residence:', result.residence?.residence_name);
          console.log('🏠 [UNITS] Units:', result.units);
          setUnits(result.units);
        } else {
          console.warn('⚠️ [UNITS] No units found for this residence');
          console.warn('⚠️ [UNITS] Status:', result.status);
          console.warn('⚠️ [UNITS] Units:', result.units);
          setUnits([]);
        }
      } catch (error) {
        console.error('❌ [UNITS] Error fetching units:', error);
        console.error('❌ [UNITS] Error details:', {
          name: error instanceof Error ? error.name : 'Unknown',
          message: error instanceof Error ? error.message : String(error),
        });
        setUnits([]);
      } finally {
        setLoadingUnits(false);
        console.log('🏠 [UNITS] Fetch completed.');
      }
    };

    fetchUnits();
  }, [formData.residence_id]);

  // Handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      console.log('📎 [FILE-UPLOAD] File selected:', file.name, 'Size:', file.size, 'Type:', file.type);
      
      // Check file size (max 3MB = 3 * 1024 * 1024 bytes)
      const maxSize = 3 * 1024 * 1024; // 3MB in bytes
      if (file.size > maxSize) {
        console.error('❌ [FILE-UPLOAD] File size exceeds 3MB limit');
        setErrors(prev => ({
          ...prev,
          file: t('fileSizeExceeded') || 'File size must not exceed 3MB'
        }));
        // Clear the file input
        e.target.value = '';
        return;
      }
      
      // Clear any previous file errors
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors.file;
        return newErrors;
      });
      
      setSelectedFile(file);
      
      // Convert file to base64
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        console.log('✅ [FILE-UPLOAD] File converted to base64, length:', base64String.length);
        
        // Update form data with base64 string
        setFormData(prev => ({
          ...prev,
          file_url: base64String, // Store base64 string in file_url
          file_type: file.type,
          file_size: file.size,
          document_name: prev.document_name || file.name,
        }));
        
        // Set preview for images
        if (file.type.startsWith('image/')) {
          setFilePreview(base64String);
        } else {
          setFilePreview('');
        }
      };
      
      reader.onerror = () => {
        console.error('❌ [FILE-UPLOAD] Error reading file');
        setErrors(prev => ({
          ...prev,
          file: 'Failed to read file. Please try again.'
        }));
      };
      
      // Read file as data URL (base64)
      reader.readAsDataURL(file);
      
      console.log('✅ [FILE-UPLOAD] File accepted:', file.name, 'Size:', formatFileSize(file.size));
    }
  };

  // Handle input changes
  const handleInputChange = (field: string, value: any) => {
    console.log(`📝 [FORM-CHANGE] Field: ${field}, Value:`, value);
    
    // Clear unit selection when residence changes
    if (field === 'residence_id') {
      console.log('🏢 [RESIDENCE-CHANGE] Residence changed to:', value);
      console.log('🏢 [RESIDENCE-CHANGE] Clearing unit selection and fetching new units...');
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

    if (!formData.document_name.trim()) {
      newErrors.document_name = t('documentNameRequired');
    }

    if (!formData.category_id) {
      newErrors.category_id = t('categoryRequired');
    }

    if (!formData.type_id) {
      newErrors.type_id = t('typeRequired');
    }

    if (!isEditMode && !formData.file_url) {
      newErrors.file = t('fileRequired') || 'File is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    console.log('=== DOCUMENT FORM SUBMIT ===');
    console.log('Is Edit Mode:', isEditMode);
    console.log('Form Data:', formData);
    console.log('Selected File:', selectedFile);

    if (!validateForm()) {
      console.log('❌ Validation failed:', errors);
      return;
    }

    // Prepare data for submission
    const documentData = {
      ...formData,
      id: document?.id,
      uploaded_date: document?.uploaded_date || new Date().toISOString(),
      category_id: parseInt(formData.category_id) || null,
      type_id: parseInt(formData.type_id) || null,
      residence_id: formData.residence_id ? parseInt(formData.residence_id) : null,
      unit_id: formData.unit_id ? parseInt(formData.unit_id) : null,
      // file_url already contains base64 string from handleFileChange
    };

    console.log('📤 Submitting document data:', documentData);
    console.log('📤 File URL (base64) length:', documentData.file_url?.length || 0);
    onSave(documentData);
  };

  // Format file size for display
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    if (bytes < 1024) return bytes + ' Bytes';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
    return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
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
                {isEditMode ? t('editDocument') : t('createDocument')}
              </h2>
              <p className="text-sm text-neutral-ink-500">
                {isEditMode ? t('updateDocument') : t('uploadDocument')}
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
            {/* File Upload */}
            <div className="space-y-2">
              <Label htmlFor="file" className="text-neutral-ink-700">
                {t('selectFile')} {!isEditMode && <span className="text-red-500">*</span>}
              </Label>
              <div className="border-2 border-dashed border-neutral-line-300 rounded-2xl p-6 text-center hover:border-[#6A8F7B] transition-colors duration-300">
                <input
                  id="file"
                  type="file"
                  onChange={handleFileChange}
                  className="hidden"
                  accept=".pdf,.doc,.docx,.ppt,.pptx,image/*"
                />
                <label htmlFor="file" className="cursor-pointer">
                  {selectedFile || filePreview ? (
                    <div className="space-y-3">
                      {filePreview && selectedFile?.type.startsWith('image/') && (
                        <img
                          src={filePreview}
                          alt="Preview"
                          className="max-h-32 mx-auto rounded-lg"
                        />
                      )}
                      <div className="flex items-center justify-center gap-3">
                        <File className="w-8 h-8 text-[#6A8F7B]" />
                        <div className="text-left">
                          <p className="text-sm text-neutral-ink-900">
                            {selectedFile?.name || formData.document_name}
                          </p>
                          <p className="text-xs text-neutral-ink-500">
                            {formatFileSize(selectedFile?.size || formData.file_size)}
                          </p>
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="rounded-xl mt-2"
                      >
                        {t('changeFile') || 'Change File'}
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="w-12 h-12 mx-auto rounded-full bg-gradient-to-br from-[#6A8F7B] to-[#5a7a68] flex items-center justify-center">
                        <Upload className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <p className="text-sm text-neutral-ink-900 mb-1">
                          {t('clickToUpload') || 'Click to upload file'}
                        </p>
                        <p className="text-xs text-neutral-ink-500">
                          PDF, DOC, DOCX, PPT, PPTX, Images (max 3MB)
                        </p>
                      </div>
                    </div>
                  )}
                </label>
              </div>
              {errors.file && (
                <div className="flex items-center gap-2 text-red-600 text-sm mt-2">
                  <AlertCircle className="w-4 h-4" />
                  <span>{errors.file}</span>
                </div>
              )}
            </div>

            {/* Document Name */}
            <div className="space-y-2">
              <Label htmlFor="document_name" className="text-neutral-ink-700">
                {t('documentName')} <span className="text-red-500">*</span>
              </Label>
              <Input
                id="document_name"
                type="text"
                value={formData.document_name}
                onChange={(e) => handleInputChange('document_name', e.target.value)}
                placeholder={t('enterDocumentName')}
                className="rounded-xl border-neutral-line-200 focus:border-[#6A8F7B]"
              />
              {errors.document_name && (
                <div className="flex items-center gap-2 text-red-600 text-sm mt-2">
                  <AlertCircle className="w-4 h-4" />
                  <span>{errors.document_name}</span>
                </div>
              )}
            </div>

            {/* Document Description */}
            <div className="space-y-2">
              <Label htmlFor="document_description" className="text-neutral-ink-700">
                {t('documentDescription')}
              </Label>
              <Textarea
                id="document_description"
                value={formData.document_description}
                onChange={(e) => handleInputChange('document_description', e.target.value)}
                placeholder={t('enterDocumentDescription')}
                className="rounded-xl border-neutral-line-200 focus:border-[#6A8F7B] min-h-[100px]"
              />
            </div>

            {/* Category and Type - Side by Side */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Category */}
              <div className="space-y-2">
                <Label htmlFor="category_id" className="text-neutral-ink-700">
                  {t('categoryId')} <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={formData.category_id ?? ''}
                  onValueChange={(value) => handleInputChange('category_id', String(value ?? ''))}
                  disabled={loadingCategories}
                >
                  <SelectTrigger
                    id="category_id"
                    className={`rounded-none border-0 border-b-2 ${
                      errors.category_id
                        ? 'border-red-500 focus:border-red-500'
                        : 'border-neutral-line-200 focus:border-[#6A8F7B]'
                    } shadow-sm focus:shadow-md transition-all`}
                  >
                    <SelectValue
                      placeholder={
                        loadingCategories
                          ? (t('loading') || 'Loading...')
                          : categories.length === 0
                            ? (t('noCategories') || 'No categories')
                            : t('selectCategory')
                      }
                    />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    {categories.map((category) => (
                      <SelectItem
                        key={category.id}
                        value={String(category.id)}
                        className="rounded-lg"
                      >
                        {category.category_name == null || category.category_name.trim() === ''
                          ? '—'
                          : category.category_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.category_id && (
                  <p className="text-xs text-red-500 mt-1">{errors.category_id}</p>
                )}
              </div>

              {/* Type */}
              <div className="space-y-2">
                <Label htmlFor="type_id" className="text-neutral-ink-700">
                  {t('typeId')} <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={formData.type_id ?? ''}
                  onValueChange={(value) => handleInputChange('type_id', String(value ?? ''))}
                  disabled={loadingTypes}
                >
                  <SelectTrigger
                    id="type_id"
                    className={`rounded-none border-0 border-b-2 ${
                      errors.type_id
                        ? 'border-red-500 focus:border-red-500'
                        : 'border-neutral-line-200 focus:border-[#6A8F7B]'
                    } shadow-sm focus:shadow-md transition-all`}
                  >
                    <SelectValue
                      placeholder={
                        loadingTypes
                          ? (t('loading') || 'Loading...')
                          : types.length === 0
                            ? (t('noTypes') || 'No types')
                            : t('selectType')
                      }
                    />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    {types.map((type) => (
                      <SelectItem
                        key={type.id}
                        value={String(type.id)}
                        className="rounded-lg"
                      >
                        {type.type_name == null || type.type_name.trim() === ''
                          ? '—'
                          : type.type_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.type_id && (
                  <p className="text-xs text-red-500 mt-1">{errors.type_id}</p>
                )}
              </div>
            </div>

            {/* Residence and Unit - Side by Side */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Residence */}
              <div className="space-y-2">
                <Label htmlFor="residence_id" className="text-neutral-ink-700">
                  {t('building')}
                </Label>
                <Select
                  value={formData.residence_id ?? ''}
                  onValueChange={(value) => handleInputChange('residence_id', String(value ?? ''))}
                  disabled={!!prefilledData || loadingResidences}
                >
                  <SelectTrigger
                    id="residence_id"
                    className={`rounded-none border-0 border-b-2 ${
                      prefilledData
                        ? 'border-neutral-line-200 bg-neutral-line-100 text-neutral-ink-400 cursor-not-allowed pointer-events-none'
                        : 'border-neutral-line-200 focus:border-[#6A8F7B]'
                    } shadow-sm focus:shadow-md transition-all`}
                    disabled={!!prefilledData || loadingResidences}
                  >
                    <SelectValue
                      placeholder={
                        loadingResidences
                          ? (t('loading') || 'Loading...')
                          : residences.length === 0
                            ? (t('noBuildings') || 'No buildings')
                            : t('selectBuilding')
                      }
                    />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    {residences.map((residence) => (
                      <SelectItem
                        key={residence.id}
                        value={String(residence.id)}
                        className="rounded-lg"
                      >
                        <div className="flex items-center gap-2">
                          <Building2 className="w-4 h-4 text-[#6A8F7B]" />
                          <span>
                            {residence.residence_name == null || residence.residence_name.trim() === ''
                              ? '—'
                              : residence.residence_name}
                          </span>
                        </div>
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
                  value={formData.unit_id ?? ''}
                  onValueChange={(value) => handleInputChange('unit_id', String(value ?? ''))}
                  disabled={!!prefilledData || loadingUnits}
                >
                  <SelectTrigger
                    id="unit_id"
                    className={`rounded-none border-0 border-b-2 ${
                      prefilledData
                        ? 'border-neutral-line-200 bg-neutral-line-100 text-neutral-ink-400 cursor-not-allowed pointer-events-none'
                        : 'border-neutral-line-200 focus:border-[#6A8F7B]'
                    } shadow-sm focus:shadow-md transition-all`}
                    disabled={!!prefilledData || loadingUnits}
                  >
                    <SelectValue
                      placeholder={
                        loadingUnits
                          ? (t('loading') || 'Loading...')
                          : units.length === 0
                            ? (t('noUnits') || 'No units')
                            : t('selectUnit')
                      }
                    />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    {units.map((unit) => (
                      <SelectItem
                        key={unit.id}
                        value={String(unit.id)}
                        className="rounded-lg"
                      >
                        {unit.name == null || unit.name.trim() === ''
                          ? '—'
                          : unit.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
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
                  <>{isEditMode ? t('updateDocument') : t('createDocument')}</>
                )}
              </Button>
            </div>
          </form>
        </Card>
      </motion.div>
    </motion.div>
  );
}