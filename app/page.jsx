'use client';

import { useState, useEffect } from 'react';
import io from 'socket.io-client';

export default function Page() {
  const [requests, setRequests] = useState([]);
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    const socketUrl = 'https://wc.flashfund.in';

    const newSocket = io(socketUrl, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    newSocket.on('connect', () => {
      console.log('Socket connected successfully');
      setIsConnected(true);
    });

    newSocket.on('onSearchRequest', (requestData) => {
      console.log('Received onSearchRequest:', requestData);
      setRequests((prevRequests) => [requestData, ...prevRequests]);
      setIsSearching(false);
    });

    newSocket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      setIsConnected(false);
      setIsSearching(false);
    });

    newSocket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
      setIsConnected(false);
      setIsSearching(false);
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, []);

  const handleSearchClick = async () => {
    setIsSearching(true);
    const apiUrl = 'https://wc.flashfund.in/search';

    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: 'search term',
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch data');
      }

      const data = await response.json();
      console.log('Search request sent successfully:', data);

      if (socket) {
        socket.emit('startSearch');
      }
    } catch (error) {
      console.error('Error during search:', error);
      setIsSearching(false);
    }
  };

  return (
    <div className="grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20 font-[family-name:var(--font-geist-sans)]">
      <button
        className="btn"
        onClick={handleSearchClick}
        disabled={isSearching}
      >
        <span className="btn-text-one">{isSearching ? 'Searching...' : 'Search'}</span>
        <span className="btn-text-two">{isSearching ? 'Please wait...' : 'Great!'}</span>
      </button>

      {isSearching && <div className="mt-4 text-lg text-gray-600">Searching, please wait...</div>}

      <div className="container mx-auto px-4 py-8">
        <div className="mb-4">
          <h1 className="text-2xl font-bold">On Search Requests</h1>
          <div className={`mt-2 ${isConnected ? 'text-green-600' : 'text-red-600'}`}>
            Connection Status: {isConnected ? 'Connected' : 'Disconnected'}
          </div>
        </div>

        <div>
          {requests.length === 0 ? (
            <p>No search requests received yet.</p>
          ) : (
            <table className="w-full border-collapse border border-gray-200">
              <thead className="bg-blue-400">
                <tr>
                  <th className="border p-2">Request #</th>
                  <th className="border p-2">Timestamp</th>
                  <th className="border p-2">Transaction ID</th>
                  <th className="border p-2">Provider Name</th>
                  <th className="border p-2">Email</th>
                  <th className="border p-2">Address</th>
                  <th className="border p-2">Form URL</th>
                  <th className="border p-2">Client IP</th>
                </tr>
              </thead>
              <tbody>
                {requests.map((request, index) => {
                  const providerName = request.body.message.catalog?.providers?.[0]?.descriptor?.name;

                  if (!providerName) return null;

                  const email = request.body.message.catalog?.tags?.find(tag => tag.descriptor?.code === 'CONTACT_INFO')?.list?.find(info => info.descriptor?.code === 'GRO_EMAIL')?.value || 'Not Available';
                  
                  const address = request.body.message.catalog?.tags?.find(tag => tag.descriptor?.code === 'LSP_INFO')?.list?.find(info => info.descriptor?.code === 'LSP_ADDRESS')?.value || 'Not Available';
                  
                  const formUrl = request.body.message.catalog?.providers?.[0]?.items?.[0]?.xinput?.form?.url;

                  return (
                    <tr key={index} className="hover:bg-gray-400">
                      <td className="border p-2 text-center">{index + 1}</td>
                      <td className="border p-2">{request.timestamp}</td>
                      <td className="border p-2">{JSON.stringify(request.body.context.transaction_id)}</td>
                      <td className="border p-2">{providerName}</td>
                      <td className="border p-2">{email}</td>
                      <td className="border p-2">{address}</td>
                      <td className="border p-2">
                        {formUrl ? (
                          <a 
                            href={formUrl} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="text-blue-600 hover:underline"
                          >
                            {formUrl}
                          </a>
                        ) : 'Not Available'}
                      </td>
                      <td className="border p-2">{request.clientIp}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}