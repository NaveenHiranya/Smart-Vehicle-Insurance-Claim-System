import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useDropzone } from 'react-dropzone';
import api from '../services/api';
import type { Vehicle, InsurancePolicy } from '../types';
import { Camera, Image, X, ChevronLeft, ChevronRight, Check, MapPin, FolderOpen } from 'lucide-react';

const steps = ['Incident Info', 'Select Garage', 'Vehicle Photos', 'Damage Photos', 'Review & Submit'];

export function NewClaimPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [policies, setPolicies] = useState<InsurancePolicy[]>([]);
  const [claimId, setClaimId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [uploadedImages, setUploadedImages] = useState<{ full: File[]; damage: File[] }>({ full: [], damage: [] });
  const [garages, setGarages] = useState<any[]>([]);
  const fullCameraRef = useRef<HTMLInputElement>(null);
  const damageCameraRef = useRef<HTMLInputElement>(null);
  const fullBrowseRef = useRef<HTMLInputElement>(null);
  const damageBrowseRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    vehicleId: searchParams.get('vehicleId') || '',
    garageId: '',
    policyId: '',
    incidentDate: new Date().toISOString().split('T')[0],
    incidentLocation: '',
    incidentDescription: '',
    weatherConditions: '',
    hasPoliceReport: false,
  });

  useEffect(() => {
    Promise.all([api.get('/vehicles'), api.get('/policies'), api.get('/claims/garages')]).then(([vRes, pRes, gRes]) => {
      setVehicles(vRes.data);
      setPolicies(pRes.data);
      setGarages(gRes.data);
    });
  }, []);

  const update = (f: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const value = e.target.type === 'checkbox' ? (e.target as HTMLInputElement).checked : e.target.value;
    setForm((p) => ({ ...p, [f]: value }));
  };

  const onDropFull = useCallback((files: File[]) => {
    setUploadedImages((prev) => ({ ...prev, full: [...prev.full, ...files] }));
  }, []);

  const onDropDamage = useCallback((files: File[]) => {
    setUploadedImages((prev) => ({ ...prev, damage: [...prev.damage, ...files] }));
  }, []);

  const fullDropzone = useDropzone({ onDrop: onDropFull, accept: { 'image/*': ['.jpeg', '.jpg', '.png', '.webp'] }, multiple: true });
  const damageDropzone = useDropzone({ onDrop: onDropDamage, accept: { 'image/*': ['.jpeg', '.jpg', '.png', '.webp'] }, multiple: true });

  const removeFullImage = (idx: number) => {
    setUploadedImages((p) => ({ ...p, full: p.full.filter((_, i) => i !== idx) }));
  };

  const removeDamageImage = (idx: number) => {
    setUploadedImages((p) => ({ ...p, damage: p.damage.filter((_, i) => i !== idx) }));
  };

  const handleCameraCapture = (type: 'full' | 'damage') => (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    setUploadedImages((prev) => ({ ...prev, [type]: [...prev[type], ...files] }));
    e.target.value = ''; // reset so the same file can be re-captured
  };

  const uploadImages = async (cId: string, files: File[], type: string) => {
    if (files.length === 0) return;
    const formData = new FormData();
    files.forEach((file) => formData.append('images', file));
    formData.append('imageType', type);
    await api.post(`/claims/${cId}/images`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError('');
    try {
      let cId = claimId;

      if (!cId) {
        const res = await api.post('/claims', form);
        cId = res.data.id;
        setClaimId(cId);
      }

      await uploadImages(cId!, uploadedImages.full, 'FULL_VEHICLE');
      await uploadImages(cId!, uploadedImages.damage, 'DAMAGE_CLOSEUP');

      await api.post(`/claims/${cId}/submit`);
      navigate(`/claims/${cId}`);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to submit claim');
    } finally {
      setLoading(false);
    }
  };

  const canProceed = () => {
    if (step === 0) return form.vehicleId && form.incidentDate && form.incidentLocation && form.incidentDescription;
    if (step === 1) return true; // garage is optional
    if (step === 2) return uploadedImages.full.length > 0;
    return true;
  };

  const selectedVehicle = vehicles.find((v) => v.id === form.vehicleId);
  const selectedGarage = garages.find((g) => g.id === form.garageId);

  return (
    <div className="max-w-3xl mx-auto">
      <button onClick={() => navigate(-1)} className="text-sm text-primary-600 hover:text-primary-700 mb-4 font-medium">&larr; Back</button>

      {/* Step Indicator */}
      <div className="flex items-center justify-between mb-8">
        {steps.map((s, i) => (
          <div key={s} className="flex items-center">
            <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium ${
              i < step ? 'bg-primary-600 text-white' : i === step ? 'bg-primary-100 text-primary-700 ring-2 ring-primary-600' : 'bg-gray-200 text-gray-500'
            }`}>
              {i < step ? <Check className="h-4 w-4" /> : i + 1}
            </div>
            <span className={`ml-2 text-xs font-medium hidden sm:block ${i === step ? 'text-primary-700' : 'text-gray-500'}`}>{s}</span>
            {i < steps.length - 1 && <div className={`w-8 sm:w-16 h-0.5 mx-2 ${i < step ? 'bg-primary-600' : 'bg-gray-200'}`} />}
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>}

        {/* Step 1: Incident Info */}
        {step === 0 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Incident Information</h2>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Vehicle *</label>
              <select value={form.vehicleId} onChange={update('vehicleId')}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none">
                <option value="">Select a vehicle</option>
                {vehicles.map((v) => (
                  <option key={v.id} value={v.id}>{v.year} {v.make} {v.model} ({v.licensePlate})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Insurance Policy</label>
              <select value={form.policyId} onChange={update('policyId')}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none">
                <option value="">Use my active policy (default)</option>
                {policies.map((p) => (
                  <option key={p.id} value={p.id}>{p.coverageType} · {p.template?.name || p.providerName} - {p.policyNumber}</option>
                ))}
              </select>
              <p className="mt-1 text-xs text-gray-400">The claim is deducted from this policy — deductible and coverage % apply to the payout.</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Incident Date *</label><input type="date" value={form.incidentDate} onChange={update('incidentDate')} required className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Weather (optional)</label><input type="text" value={form.weatherConditions} onChange={update('weatherConditions')} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none" placeholder="Clear, rainy, etc." /></div>
            </div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Location *</label><input type="text" value={form.incidentLocation} onChange={update('incidentLocation')} required className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none" placeholder="Address or intersection" /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Description *</label><textarea value={form.incidentDescription} onChange={update('incidentDescription')} required rows={4} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none resize-none" placeholder="Describe what happened..." /></div>
            <label className="flex items-center gap-2"><input type="checkbox" checked={form.hasPoliceReport} onChange={update('hasPoliceReport')} className="rounded" /><span className="text-sm text-gray-700">Police report filed</span></label>
          </div>
        )}

        {/* Step 2: Select Garage */}
        {step === 1 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Select a Registered Garage (Optional)</h2>
            <p className="text-sm text-gray-500 mb-4">Choose a garage to review and provide repair estimates for your vehicle. The garage can add their own assessment after AI analysis.</p>
            {garages.length === 0 ? (
              <div className="p-8 text-center border-2 border-dashed border-gray-200 rounded-xl">
                <p className="text-sm text-gray-500">No registered garages available. You can skip this step.</p>
              </div>
            ) : (
              <div className="space-y-2">
                <label
                  className={`flex items-center gap-3 p-4 border-2 rounded-xl cursor-pointer transition ${
                    !form.garageId ? 'border-primary-500 bg-primary-50' : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => setForm((p) => ({ ...p, garageId: '' }))}
                >
                  <input type="radio" name="garage" checked={!form.garageId} onChange={() => setForm((p) => ({ ...p, garageId: '' }))} className="sr-only" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">No garage selected</p>
                    <p className="text-xs text-gray-500">Skip garage selection and proceed without one</p>
                  </div>
                </label>
                {garages.map((g) => (
                  <label
                    key={g.id}
                    className={`flex items-center gap-3 p-4 border-2 rounded-xl cursor-pointer transition ${
                      form.garageId === g.id ? 'border-primary-500 bg-primary-50' : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => setForm((p) => ({ ...p, garageId: g.id }))}
                  >
                    <input type="radio" name="garage" checked={form.garageId === g.id} onChange={() => setForm((p) => ({ ...p, garageId: g.id }))} className="sr-only" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">{g.name}</p>
                      <p className="text-xs text-gray-500 flex items-center gap-1"><MapPin className="h-3 w-3" />{g.address}, {g.city}</p>
                      <p className="text-xs text-gray-500">{g.phone}</p>
                    </div>
                    {form.garageId === g.id && (
                      <Check className="h-5 w-5 text-primary-600 flex-shrink-0" />
                    )}
                  </label>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Step 3: Full Vehicle Photos */}
        {step === 2 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Full Vehicle Photos</h2>
            <p className="text-sm text-gray-500 mb-4">Upload photos of your entire vehicle from different angles (front, rear, left, right sides).</p>
            <div className="flex flex-col sm:flex-row gap-3">
              <div {...fullDropzone.getRootProps()} className="hidden sm:flex flex-1 border-2 border-dashed border-gray-300 rounded-xl p-8 text-center cursor-pointer hover:border-primary-400 transition flex-col items-center justify-center">
                <input {...fullDropzone.getInputProps()} />
                <Camera className="h-10 w-10 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-600">Drag & drop photos here, or <span className="text-primary-600 font-medium">browse</span></p>
                <p className="text-xs text-gray-400 mt-1">JPEG, PNG, or WebP (max 10MB each)</p>
              </div>
              <div className="flex sm:flex-col gap-2 sm:w-40">
                <button type="button" onClick={() => fullCameraRef.current?.click()}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-primary-600 text-white rounded-xl text-sm font-medium hover:bg-primary-700 transition shadow-sm">
                  <Camera className="h-5 w-5" /> <span>Take Photo</span>
                </button>
                <button type="button" onClick={() => fullBrowseRef.current?.click()}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-white border border-gray-300 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-50 transition">
                  <FolderOpen className="h-5 w-5" /> <span>Browse</span>
                </button>
                <input ref={fullCameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleCameraCapture('full')} />
                <input ref={fullBrowseRef} type="file" accept="image/*" multiple className="hidden" onChange={handleCameraCapture('full')} />
              </div>
            </div>
            {uploadedImages.full.length > 0 && (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 mt-4">
                {uploadedImages.full.map((file, i) => (
                  <div key={i} className="relative aspect-square rounded-lg overflow-hidden border border-gray-200">
                    <img src={URL.createObjectURL(file)} alt="" className="w-full h-full object-cover" />
                    <button onClick={() => removeFullImage(i)} className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-1"><X className="h-3 w-3" /></button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Step 4: Damage Close-up Photos */}
        {step === 3 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Damage Close-Up Photos</h2>
            <p className="text-sm text-gray-500 mb-4">Upload close-up photos of specific damaged areas for detailed AI analysis.</p>
            <div className="flex flex-col sm:flex-row gap-3">
              <div {...damageDropzone.getRootProps()} className="hidden sm:flex flex-1 border-2 border-dashed border-gray-300 rounded-xl p-8 text-center cursor-pointer hover:border-primary-400 transition flex-col items-center justify-center">
                <input {...damageDropzone.getInputProps()} />
                <Image className="h-10 w-10 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-600">Drag & drop close-up photos here, or <span className="text-primary-600 font-medium">browse</span></p>
              </div>
              <div className="flex sm:flex-col gap-2 sm:w-40">
                <button type="button" onClick={() => damageCameraRef.current?.click()}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-primary-600 text-white rounded-xl text-sm font-medium hover:bg-primary-700 transition shadow-sm">
                  <Camera className="h-5 w-5" /> <span>Take Photo</span>
                </button>
                <button type="button" onClick={() => damageBrowseRef.current?.click()}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-white border border-gray-300 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-50 transition">
                  <FolderOpen className="h-5 w-5" /> <span>Browse</span>
                </button>
                <input ref={damageCameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleCameraCapture('damage')} />
                <input ref={damageBrowseRef} type="file" accept="image/*" multiple className="hidden" onChange={handleCameraCapture('damage')} />
              </div>
            </div>
            {uploadedImages.damage.length > 0 && (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 mt-4">
                {uploadedImages.damage.map((file, i) => (
                  <div key={i} className="relative aspect-square rounded-lg overflow-hidden border border-gray-200">
                    <img src={URL.createObjectURL(file)} alt="" className="w-full h-full object-cover" />
                    <button onClick={() => removeDamageImage(i)} className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-1"><X className="h-3 w-3" /></button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Step 5: Review & Submit */}
        {step === 4 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Review & Submit</h2>
            {selectedVehicle && (
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm font-medium text-gray-900">Vehicle</p>
                <p className="text-sm text-gray-600">{selectedVehicle.year} {selectedVehicle.make} {selectedVehicle.model} ({selectedVehicle.licensePlate})</p>
              </div>
            )}
            <div className="p-4 bg-gray-50 rounded-lg space-y-2">
              <div className="flex justify-between text-sm"><span className="text-gray-500">Date:</span><span className="font-medium">{form.incidentDate}</span></div>
              <div className="flex justify-between text-sm"><span className="text-gray-500">Location:</span><span className="font-medium">{form.incidentLocation}</span></div>
              <div className="text-sm"><span className="text-gray-500">Description:</span><p className="font-medium mt-1">{form.incidentDescription}</p></div>
              <div className="flex justify-between text-sm"><span className="text-gray-500">Police Report:</span><span className="font-medium">{form.hasPoliceReport ? 'Yes' : 'No'}</span></div>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm font-medium text-gray-900 mb-1">Photos</p>
              <p className="text-sm text-gray-600">{uploadedImages.full.length} full vehicle, {uploadedImages.damage.length} damage close-up</p>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm font-medium text-gray-900 mb-1">Garage</p>
              <p className="text-sm text-gray-600">{selectedGarage ? `${selectedGarage.name} — ${selectedGarage.city}` : 'None selected'}</p>
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="flex justify-between mt-6 pt-4 border-t border-gray-200">
          <button onClick={() => setStep(Math.max(0, step - 1))} disabled={step === 0}
            className="flex items-center gap-1 px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 disabled:opacity-0 disabled:pointer-events-none">
            <ChevronLeft className="h-4 w-4" /> Back
          </button>
          {step < steps.length - 1 ? (
            <button onClick={() => setStep(step + 1)} disabled={!canProceed()}
              className="flex items-center gap-1 px-6 py-2.5 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed">
              Next <ChevronRight className="h-4 w-4" />
            </button>
          ) : (
            <button onClick={handleSubmit} disabled={loading}
              className="flex items-center gap-2 px-6 py-2.5 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 disabled:opacity-50">
              {loading ? 'Submitting...' : 'Submit Claim'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
