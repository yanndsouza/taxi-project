import { APIProvider, Map } from '@vis.gl/react-google-maps';
import AddressInputBar from './AddressInputBar';
import { ErrorProvider } from './ErrorProvider';

const App = () => {
  const API_KEY = process.env.GOOGLE_API_KEY as string;

  return (
    <div className="relative h-screen">
      <ErrorProvider>
        <AddressInputBar />
      </ErrorProvider>
      <APIProvider apiKey={API_KEY}>
        <Map
          style={{ width: '100%', height: '100%' }}
          defaultCenter={{ lat: -23.5505, lng: -46.6333 }}
          defaultZoom={10}
          gestureHandling={'greedy'}
          disableDefaultUI={true}
        />
      </APIProvider>
    </div >
  );
};

export default App;
