/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import Greeting from './components/Greeting';

export default function App() {
  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center flex-col">
      <h1 className="text-4xl font-bold text-gray-800">Welcome to EduEats!</h1>
      <Greeting />
    </div>
  );
}
