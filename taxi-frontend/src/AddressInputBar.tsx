import { useState } from 'react';
import axios from 'axios';
import { useError } from './ErrorProvider';

interface Driver {
  id: number;
  name: string;
}

interface RideDetails {
  id: number;
  date: string;
  origin: string;
  destination: string;
  distance: number;
  duration: string;
  driver: Driver;
  value: number;
}

interface RideHistoryResponse {
  customer_id: string;
  rides: RideDetails[];
}

interface DriverOption {
  id: number;
  name: string;
  description: string;
  vehicle: string;
  review: {
    rating: number;
    comment: string;
  };
  value: number;
}

interface RideEstimateResponse {
  origin: { latitude: number; longitude: number };
  destination: { latitude: number; longitude: number };
  distance: number;
  duration: string;
  options: DriverOption[];
  routeResponse: object;
}

const AddressInputBar = () => {
  const { showError } = useError();
  const [customerId, setCustomerId] = useState('');
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [rideEstimate, setRideEstimate] = useState<RideEstimateResponse | null>(null);
  const [selectedDriver, setSelectedDriver] = useState<DriverOption | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('input');
  const [rideHistory, setRideHistory] = useState<RideDetails[]>([]);
  const [historyCustomerId, setHistoryCustomerId] = useState('');
  const [historyDriverId, setHistoryDriverId] = useState<number | null>(null);

  const fetchRideHistory = async (custId: string, drvId?: number) => {
    if (!custId) {
      showError('Por favor, insira um ID de cliente válido');
      return;
    }

    try {
      const url = drvId
        ? `http://localhost:8080/ride/${custId}?driver_id=${drvId}`
        : `http://localhost:8080/ride/${custId}`;

      const response = await axios.get<RideHistoryResponse>(url);
      setRideHistory(response.data.rides);
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        if (error.response.status === 400) {
          showError('Dados inválidos para busca de histórico');
        } else {
          showError('Erro ao buscar histórico de viagens');
        }
      } else {
        showError('Erro de conexão');
      }
    }
  };

  const handleSearch = async () => {
    if (!customerId || !origin || !destination) {
      showError('Por favor, preencha todos os campos');
      return;
    }

    try {
      const response = await axios.post<RideEstimateResponse>('http://localhost:8080/ride/estimate', {
        customer_id: customerId,
        origin: origin,
        destination: destination
      });

      setRideEstimate(response.data);
      setViewMode('drivers');
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        if (error.response.status === 400) {
          showError('Dados inválidos para estimativa de corrida');
        } else {
          showError('Erro na estimativa de corrida');
        }
      } else {
        showError('Erro de conexão');
      }
    }
  };

  const handleConfirmRide = async () => {
    if (!rideEstimate || !selectedDriver) {
      showError('Por favor, selecione um motorista');
      return;
    }

    try {
      await axios.patch('http://localhost:8080/ride/confirm', {
        customer_id: customerId,
        origin: origin,
        destination: destination,
        distance: rideEstimate.distance,
        duration: rideEstimate.duration,
        driver: {
          id: selectedDriver.id,
          name: selectedDriver.name
        },
        value: selectedDriver.value
      });

      await fetchRideHistory(customerId);
      setHistoryCustomerId(customerId);
      setViewMode('history');
    } catch (error) {
      showError('Erro na confirmação da corrida');
    }
  };

  type ViewMode = 'input' | 'drivers' | 'history';

  const renderHistoryView = () => (
    <div className="absolute z-10 top-4 left-4 right-4">
      <div className="bg-white shadow-lg rounded-lg p-4 space-y-4">
        <h2 className="text-xl font-bold text-center">Histórico de Viagens</h2>

        <div className="flex space-x-2">
          <input
            type="text"
            placeholder="ID do Cliente"
            value={historyCustomerId}
            onChange={(e) => setHistoryCustomerId(e.target.value)}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md"
          />
          <select
            value={historyDriverId || ''}
            onChange={(e) => setHistoryDriverId(e.target.value ? parseInt(e.target.value) : null)}
            className="px-3 py-2 border border-gray-300 rounded-md"
          >
            <option value="">Todos Motoristas</option>
            <option value="1">Homer Simpson</option>
            <option value="2">Dominic Toretto</option>
            <option value="3">James Bond</option>
          </select>
          <button
            onClick={() => fetchRideHistory(historyCustomerId, historyDriverId || undefined)}
            className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600"
          >
            Filtrar
          </button>
        </div>

        <div className="space-y-2 max-h-[60vh] overflow-y-auto">
          {rideHistory.map((ride) => (
            <div key={ride.id} className="border rounded-md p-3">
              <div className="flex justify-between">
                <div>
                  <p className="font-bold">{ride.origin} → {ride.destination}</p>
                  <p className="text-sm text-gray-600">{new Date(ride.date).toLocaleString()}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold">R$ {ride.value.toFixed(2)}</p>
                  <p className="text-sm">Motorista: {ride.driver.name}</p>
                </div>
              </div>
              <div className="mt-2 text-sm text-gray-700">
                <p>Distância: {ride.distance.toFixed(1)} km</p>
                <p>Duração: {ride.duration}</p>
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={() => setViewMode('input')}
          className="w-full bg-blue-500 text-white py-2 rounded-md hover:bg-blue-600"
        >
          Nova Corrida
        </button>
      </div>
    </div>
  );

  const renderDriverSelection = () => (
    <div className="absolute z-10 top-4 left-4 right-4">
      <div className="bg-white shadow-lg rounded-lg p-4 space-y-4">
        <div className="text-center">
          <p className="font-bold">Distância: {rideEstimate!.distance} km</p>
          <p>Duração estimada: {rideEstimate!.duration}</p>
        </div>
        <div className="space-y-2">
          {rideEstimate!.options.map((driver) => (
            <div
              key={driver.id}
              onClick={() => setSelectedDriver(driver)}
              className={`p-3 border rounded-md cursor-pointer ${selectedDriver?.id === driver.id
                ? 'bg-blue-100 border-blue-500'
                : 'hover:bg-gray-100'
                }`}
            >
              <div className="flex justify-between">
                <div>
                  <p className="font-bold">{driver.name}</p>
                  <p className="text-sm">{driver.description}</p>
                  <p className="text-sm text-gray-600">{driver.vehicle}</p>
                </div>
                <div className="text-right">
                  <p className="text-yellow-600">★ {driver.review.rating.toFixed(1)}</p>
                  <p className="font-bold">R$ {driver.value.toFixed(2)}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="flex space-x-2">
          <button
            onClick={() => setViewMode('input')}
            className="w-1/2 bg-gray-300 text-gray-700 py-2 rounded-md hover:bg-gray-400"
          >
            Cancelar
          </button>
          {selectedDriver && (
            <button
              onClick={handleConfirmRide}
              className="w-1/2 bg-green-500 text-white py-2 rounded-md hover:bg-green-600"
            >
              Confirmar Corrida
            </button>
          )}
        </div>
      </div>
    </div>
  );

  const renderInputView = () => (
    <div className="absolute z-10 top-4 left-4 right-4">
      <div className="bg-white shadow-lg rounded-lg p-4 space-y-2">
        <div className="flex items-center space-x-2">
          <input
            type="text"
            placeholder="ID do Cliente"
            value={customerId}
            onChange={(e) => setCustomerId(e.target.value)}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="flex items-center space-x-2">
          <input
            type="text"
            placeholder="Endereço de Origem"
            value={origin}
            onChange={(e) => setOrigin(e.target.value)}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="flex items-center space-x-2">
          <input
            type="text"
            placeholder="Endereço de Destino"
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button onClick={handleSearch} type="submit" className="p-2.5 ms-2 text-sm font-medium text-white bg-blue-700 rounded-lg border border-blue-700 hover:bg-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-300 dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800">
            <svg className="w-4 h-4" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 20">
              <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m19 19-4-4m0-7A7 7 0 1 1 1 8a7 7 0 0 1 14 0Z" />
            </svg>
            <span className="sr-only">Search</span>
          </button>
        </div>
      </div>
    </div>
  );

  switch (viewMode) {
    case 'history':
      return renderHistoryView();
    case 'drivers':
      return renderDriverSelection();
    default:
      return renderInputView();
  }
};

export default AddressInputBar;
