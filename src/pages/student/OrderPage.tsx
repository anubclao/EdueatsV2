
import { useParams } from 'react-router-dom';

export const OrderPage = () => {
  const { date } = useParams<{ date: string }>();

  return (
    <div className="text-center p-8">
      <h1 className="text-3xl font-bold text-gray-800 mb-4">Order Page for {date}</h1>
      <p className="text-gray-600">Order details and selection will go here.</p>
    </div>
  );
};
