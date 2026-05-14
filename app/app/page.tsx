'use client';

import { useState, useEffect } from 'react';

interface ServiceStatus {
  id: number;
  service_name: string;
  status: string;
  error_message: string;
  resolved_by: string;
}

export default function Home() {
  const [services, setServices] = useState<ServiceStatus[]>([]);
  const [incidentLog, setIncidentLog] = useState<string>('');
  const [currentTime, setCurrentTime] = useState<string>('');
  const [resolvedByClaude, setResolvedByClaude] = useState<number>(0);

  useEffect(() => {
    const updateTime = () => {
      setCurrentTime(new Date().toLocaleTimeString());
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const fetchData = async () => {
    try {
      const [servicesRes, incidentsRes] = await Promise.all([
        fetch('/api/services'),
        fetch('/api/incidents')
      ]);
      const servicesData = await servicesRes.json();
      const incidentsData = await incidentsRes.json();
      setServices(Array.isArray(servicesData) ? servicesData : []);
      setIncidentLog(incidentsData.log || '');
      if (incidentsData.resolvedByClaude !== undefined) {
        setResolvedByClaude(incidentsData.resolvedByClaude);
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, []);

  const activeIncidents = services.filter(s => s.status === 'CRITICAL' || s.status === 'INVESTIGATING').length;
  const totalServices = services.length || 1;
  const okServices = services.filter(s => s.status === 'OK').length;
  const systemHealth = Math.round((okServices / totalServices) * 100);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'CRITICAL': return 'bg-red-900/50 text-red-400 border-red-600';
      case 'INVESTIGATING': return 'bg-yellow-900/50 text-yellow-400 border-yellow-600';
      case 'RESOLVED': return 'bg-blue-900/50 text-blue-400 border-blue-600';
      case 'OK': return 'bg-green-900/50 text-green-400 border-green-600';
      default: return 'bg-gray-700 text-gray-400 border-gray-600';
    }
  };

  const getRowColor = (status: string) => {
    switch (status) {
      case 'CRITICAL': return 'bg-red-950/30';
      case 'INVESTIGATING': return 'bg-yellow-950/30';
      case 'RESOLVED': return 'bg-blue-950/30';
      case 'OK': return 'bg-green-950/30';
      default: return 'bg-gray-900/30';
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-4xl font-bold text-white">🛡️ Project Sentinel</h1>
            <p className="text-gray-400 mt-1">Autonomous Incident Resolution Engine</p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-mono text-blue-400">{currentTime}</div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-red-950 border border-red-800 rounded-lg p-4">
            <div className="text-red-400 text-lg font-semibold mb-1">🔴 Active Incidents</div>
            <div className="text-4xl font-bold text-red-300">{activeIncidents}</div>
          </div>
          <div className="bg-green-950 border border-green-800 rounded-lg p-4">
            <div className="text-green-400 text-lg font-semibold mb-1">✅ Resolved by Claude</div>
            <div className="text-4xl font-bold text-green-300">{resolvedByClaude}</div>
          </div>
          <div className="bg-blue-950 border border-blue-800 rounded-lg p-4">
            <div className="text-blue-400 text-lg font-semibold mb-1">💚 System Health</div>
            <div className="text-4xl font-bold text-blue-300">{systemHealth}%</div>
          </div>
        </div>

        <div className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Services</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-900 border-b border-gray-700">
                  <th className="p-3 border-r border-gray-700">Service</th>
                  <th className="p-3 border-r border-gray-700">Status</th>
                  <th className="p-3 border-r border-gray-700">Resolved By</th>
                </tr>
              </thead>
              <tbody>
                {services.map((service) => (
                  <tr key={service.id} className={`${getRowColor(service.status)} border-b border-gray-800`}>
                    <td className="p-3 border-r border-gray-700 font-medium">{service.service_name}</td>
                    <td className="p-3 border-r border-gray-700">
                      <span className={`px-3 py-1 rounded-full text-sm border ${getStatusColor(service.status)}`}>
                        {service.status}
                      </span>
                    </td>
                    <td className="p-3 text-gray-400">{service.resolved_by || '-'}</td>
                  </tr>
                ))}
                {services.length === 0 && (
                  <tr>
                    <td colSpan={3} className="p-4 text-center text-gray-500">No services found</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div>
          <h2 className="text-2xl font-semibold mb-4">📋 Incident Log</h2>
          <div className="bg-gray-900 border border-gray-700 rounded-lg p-4 h-48 overflow-auto font-mono text-sm">
            <pre className="text-gray-300 whitespace-pre-wrap">{incidentLog || 'No incidents yet'}</pre>
          </div>
        </div>
      </div>
    </div>
  );
}