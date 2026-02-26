import { useEffect, useState } from 'react';

export default function Greeting() {
  const [message, setMessage] = useState('Loading...');

  useEffect(() => {
    fetch('/api/health')
      .then((res) => res.json())
      .then((data) => setMessage(data.status))
      .catch((error) => console.error('Error fetching health status:', error));
  }, []);

  return (
    <div className="mt-4 text-lg text-gray-700">
      API Status: {message}
    </div>
  );
}
