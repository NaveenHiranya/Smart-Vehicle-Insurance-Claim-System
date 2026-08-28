import { useState, useEffect, useCallback, useRef, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDropzone } from 'react-dropzone';
import api from '../services/api';
import type { Vehicle } from '../types';
import { Car, Plus, Trash2, Upload, Sparkles, CheckCircle, AlertCircle, X, Loader, Check, Camera } from 'lucide-react';

export function VehiclesPage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/vehicles').then((res) => { setVehicles(res.data); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600"></div></div>;

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">My Vehicles</h1>
        <Link to="/vehicles/new" className="bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-700 flex items-center gap-2">
          <Plus className="h-4 w-4" /> Add Vehicle
        </Link>
      </div>

      {vehicles.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
          <Car className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-1">No vehicles registered</h3>
          <p className="text-gray-500 mb-4">Add your first vehicle to start filing claims</p>
          <Link to="/vehicles/new" className="text-primary-600 font-medium hover:text-primary-700">Add a vehicle</Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {vehicles.map((v: Vehicle) => (
            <Link key={v.id} to={`/vehicles/${v.id}`}
              className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 hover:shadow-md transition">
              <div className="flex items-start justify-between mb-3">
                <div className="p-2 bg-primary-100 rounded-lg"><Car className="h-6 w-6 text-primary-600" /></div>
                <span className="text-xs text-gray-500">{v.licensePlate}</span>
              </div>
              <h3 className="font-semibold text-gray-900 text-lg">{v.year} {v.make} {v.model}</h3>
              <p className="text-sm text-gray-500 mt-1">{v.color} {v.mileage ? `- ${v.mileage.toLocaleString()} mi` : ''}</p>
              <div className="mt-3 pt-3 border-t border-gray-100 flex justify-between text-sm">
                <span className="text-gray-500">{v._count?.claims || 0} claim(s)</span>
                <span className="text-primary-600 font-medium">View details</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export function VehicleDetailPage() {
  const [vehicle, setVehicle] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const vehicleId = window.location.pathname.split('/').pop();

  useEffect(() => {
    api.get(`/vehicles/${vehicleId}`).then((res) => { setVehicle(res.data); setLoading(false); }).catch(() => navigate('/vehicles'));
  }, [vehicleId]);

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this vehicle?')) return;
    try {
      await api.delete(`/vehicles/${vehicleId}`);
      navigate('/vehicles');
    } catch { alert('Failed to delete vehicle'); }
  };

  if (loading || !vehicle) return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600"></div></div>;

  return (
    <div className="max-w-4xl mx-auto">
      <button onClick={() => navigate('/vehicles')} className="text-sm text-primary-600 hover:text-primary-700 mb-4 font-medium">
        &larr; Back to Vehicles
      </button>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{vehicle.year} {vehicle.make} {vehicle.model}</h1>
            <p className="text-gray-500">{vehicle.color} - {vehicle.licensePlate}</p>
          </div>
          <button onClick={handleDelete} className="p-2 text-gray-400 hover:text-red-600 transition">
            <Trash2 className="h-5 w-5" />
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div><p className="text-xs text-gray-500 uppercase">VIN</p><p className="font-medium text-gray-900">{vehicle.vin || 'N/A'}</p></div>
          <div><p className="text-xs text-gray-500 uppercase">License Plate</p><p className="font-medium text-gray-900">{vehicle.licensePlate}</p></div>
          <div><p className="text-xs text-gray-500 uppercase">Mileage</p><p className="font-medium text-gray-900">{vehicle.mileage ? `${vehicle.mileage.toLocaleString()} mi` : 'N/A'}</p></div>
          <div><p className="text-xs text-gray-500 uppercase">Color</p><p className="font-medium text-gray-900">{vehicle.color}</p></div>
        </div>
      </div>

      <Link to={`/claims/new?vehicleId=${vehicle.id}`}
        className="block w-full bg-primary-600 text-white text-center py-3 rounded-xl font-semibold hover:bg-primary-700 transition mb-6">
        File a Claim for This Vehicle
      </Link>

      {vehicle.claims && vehicle.claims.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="p-4 border-b border-gray-200"><h2 className="font-semibold text-gray-900">Claim History</h2></div>
          <div className="divide-y divide-gray-100">
            {vehicle.claims.map((c: any) => (
              <Link key={c.id} to={`/claims/${c.id}`} className="flex justify-between p-4 hover:bg-gray-50">
                <span className="text-sm text-gray-900">{new Date(c.incidentDate).toLocaleDateString()}</span>
                <span className="text-xs px-2 py-1 bg-gray-100 rounded-full">{c.status}</span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function AddVehiclePage() {
  const [form, setForm] = useState({ make: '', model: '', year: '', vin: '', licensePlate: '', color: '', mileage: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  // AI detection state
  const [detectImage, setDetectImage] = useState<File | null>(null);
  const [detectPreview, setDetectPreview] = useState<string | null>(null);
  const [detecting, setDetecting] = useState(false);
  const [detectionResult, setDetectionResult] = useState<{
    make: string; model: string; year: number; color: string;
    licensePlate: string; confidence: string; additionalInfo?: string;
  } | null>(null);
  const [detectionError, setDetectionError] = useState('');
  const vehicleCameraRef = useRef<HTMLInputElement>(null);

  const onDropDetect = useCallback((files: File[]) => {
    const file = files[0];
    if (!file) return;
    setDetectImage(file);
    setDetectPreview(URL.createObjectURL(file));
    setDetectionResult(null);
    setDetectionError('');
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: onDropDetect,
    accept: { 'image/*': ['.jpeg', '.jpg', '.png', '.webp'] },
    multiple: false,
  });

  const handleDetect = async () => {
    if (!detectImage) return;
    setDetecting(true);
    setDetectionError('');
    setDetectionResult(null);
    try {
      const fd = new FormData();
      fd.append('image', detectImage);
      const res = await api.post('/vehicles/detect', fd);
      const data = res.data;
      setDetectionResult(data);
      // Auto-fill form fields
      setForm((prev) => ({
        ...prev,
        make: data.make !== 'Unknown' ? data.make : prev.make,
        model: data.model !== 'Unknown' ? data.model : prev.model,
        year: data.year ? String(data.year) : prev.year,
        color: data.color !== 'Unknown' ? data.color : prev.color,
        licensePlate: data.licensePlate ? data.licensePlate : prev.licensePlate,
      }));
    } catch (err: any) {
      setDetectionError(err.response?.data?.error || 'Detection failed. Please fill in details manually.');
    } finally {
      setDetecting(false);
    }
  };

  const clearDetectImage = () => {
    setDetectImage(null);
    setDetectPreview(null);
    setDetectionResult(null);
    setDetectionError('');
  };

  const handleVehicleCamera = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setDetectImage(file);
    setDetectPreview(URL.createObjectURL(file));
    setDetectionResult(null);
    setDetectionError('');
    e.target.value = '';
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess(false);
    try {
      const res = await api.post('/vehicles', form);
      setSuccess(true);
      setTimeout(() => navigate(`/vehicles/${res.data.id}`), 1500);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to add vehicle');
    } finally { setLoading(false); }
  };

  const update = (f: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((p) => ({ ...p, [f]: e.target.value }));

  const confidenceColor = (c: string) => {
    if (c === 'HIGH') return 'text-success-600 bg-success-50 border-success-200';
    if (c === 'MEDIUM') return 'text-warning-600 bg-warning-50 border-warning-200';
    return 'text-gray-500 bg-gray-50 border-gray-200';
  };

  return (
    <div className="max-w-2xl mx-auto">
      <button onClick={() => navigate('/vehicles')} className="text-sm text-primary-600 hover:text-primary-700 mb-4 font-medium">&larr; Back</button>

      {/* AI Detection Card */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
        <div className="flex items-center gap-2 mb-1">
          <Sparkles className="h-5 w-5 text-primary-600" />
          <h2 className="text-base font-semibold text-gray-900">AI Vehicle Recognition</h2>
          <span className="ml-auto text-xs px-2 py-0.5 bg-primary-100 text-primary-700 rounded-full font-medium">Powered by Gemini</span>
        </div>
        <p className="text-sm text-gray-500 mb-4">Upload a photo of your vehicle and AI will auto-fill the details below.</p>

        {!detectPreview ? (
          <div className="flex flex-col sm:flex-row gap-3">
            <div
              {...getRootProps()}
              className={`flex-1 border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition ${
                isDragActive ? 'border-primary-400 bg-primary-50' : 'border-gray-300 hover:border-primary-400'
              }`}
            >
              <input {...getInputProps()} />
              <Upload className="h-10 w-10 text-gray-400 mx-auto mb-2" />
              <p className="text-sm text-gray-600">
                {isDragActive ? 'Drop the image here...' : 'Drag & drop a vehicle photo, or '}
                {!isDragActive && <span className="text-primary-600 font-medium">browse</span>}
              </p>
              <p className="text-xs text-gray-400 mt-1">JPEG, PNG, or WebP (max 10MB)</p>
            </div>
            <div className="flex flex-col gap-2 sm:w-40">
              <button
                type="button"
                onClick={() => vehicleCameraRef.current?.click()}
                className="flex items-center justify-center gap-2 px-4 py-3 bg-primary-600 text-white rounded-xl text-sm font-medium hover:bg-primary-700 transition shadow-sm"
              >
                <Camera className="h-5 w-5" /> Take Photo
              </button>
              <input
                ref={vehicleCameraRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={handleVehicleCamera}
              />
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="relative rounded-xl overflow-hidden border border-gray-200 bg-gray-50">
              <img src={detectPreview} alt="Vehicle" className="w-full max-h-64 object-contain" />
              <button
                onClick={clearDetectImage}
                className="absolute top-2 right-2 bg-black/60 text-white rounded-full p-1.5 hover:bg-black/80 transition"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {detectionResult && (
              <div className={`p-3 rounded-lg border text-sm ${confidenceColor(detectionResult.confidence)}`}>
                <div className="flex items-center gap-1.5 mb-1.5 font-medium">
                  <CheckCircle className="h-4 w-4 flex-shrink-0" />
                  Detected: {detectionResult.year} {detectionResult.make} {detectionResult.model} &bull; {detectionResult.color}
                  {detectionResult.licensePlate && <> &bull; {detectionResult.licensePlate}</>}
                  <span className={`ml-auto text-xs px-1.5 py-0.5 rounded font-semibold border ${confidenceColor(detectionResult.confidence)}`}>
                    {detectionResult.confidence}
                  </span>
                </div>
                {detectionResult.additionalInfo && (
                  <p className="text-xs opacity-80">{detectionResult.additionalInfo}</p>
                )}
              </div>
            )}

            {detectionError && (
              <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                {detectionError}
              </div>
            )}

            {!detectionResult && !detectionError && (
              <button
                onClick={handleDetect}
                disabled={detecting}
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 disabled:opacity-60 transition"
              >
                {detecting ? (
                  <><Loader className="h-4 w-4 animate-spin" /> Analyzing vehicle...</>
                ) : (
                  <><Sparkles className="h-4 w-4" /> Detect Vehicle with AI</>
                )}
              </button>
            )}

            {(detectionResult || detectionError) && (
              <button
                onClick={clearDetectImage}
                className="w-full py-2 text-sm text-gray-500 hover:text-gray-700 transition"
              >
                Try a different image
              </button>
            )}
          </div>
        )}
      </div>

      {/* Manual Form Card */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h1 className="text-xl font-bold text-gray-900 mb-1">Vehicle Details</h1>
        <p className="text-sm text-gray-500 mb-5">Review and complete the fields below. AI-detected values are pre-filled.</p>
        {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>}
        {success && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700 flex items-center gap-2">
            <Check className="h-4 w-4 flex-shrink-0" />
            Vehicle registered successfully! Redirecting...
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Make *</label>
              <input type="text" value={form.make} onChange={update('make')} required
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
                placeholder="Toyota" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Model *</label>
              <input type="text" value={form.model} onChange={update('model')} required
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
                placeholder="Camry" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Year *</label>
              <input type="number" value={form.year} onChange={update('year')} required min="1900" max="2027"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
                placeholder="2024" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Color *</label>
              <input type="text" value={form.color} onChange={update('color')} required
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
                placeholder="Silver" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">License Plate *</label>
            <input type="text" value={form.licensePlate} onChange={update('licensePlate')} required
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
              placeholder="ABC-1234" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">VIN (optional)</label>
            <input type="text" value={form.vin} onChange={update('vin')}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
              placeholder="17-character VIN" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Mileage (optional)</label>
            <input type="number" value={form.mileage} onChange={update('mileage')}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
              placeholder="25000" />
          </div>
          <button type="submit" disabled={loading}
            className="w-full bg-primary-600 text-white py-3 rounded-lg font-medium hover:bg-primary-700 transition disabled:opacity-50">
            {loading ? 'Registering...' : 'Register Vehicle'}
          </button>
        </form>
      </div>
    </div>
  );
}
