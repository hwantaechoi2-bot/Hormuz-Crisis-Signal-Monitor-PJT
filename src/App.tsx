/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Dashboard } from './components/Dashboard';

export default function App() {
  return (
    <div className="min-h-screen bg-[#0B0B0F] text-gray-100 font-sans selection:bg-purple-500/30">
      <Dashboard />
    </div>
  );
}
