import React, { useEffect, useReducer, useState } from 'react';
import Header from './components/Header';
import TabPanel from './components/common/TabPanel';

// Data
import { data } from './lib/dummy';

/**
 * Pages
 */
import Home from './pages/index';
import Now from './pages/now';

import ProductionContext, { productionReducer, initialProduction } from './ProductionContext';

export default function App() {
	const [production, productionDispatch] = useReducer(productionReducer, initialProduction);
	const [currentTab, setCurrentTab] = useState('home');

	// Initialize the Context with data.
	useEffect(() => {
		if (production.currentShow === 0) {
			productionDispatch({
				type: 'INIT',
				...data,
			});
		}
	}, [production]);

	const handleTabChange = (event, newValue) => {
		setCurrentTab(newValue);
	};

	return (
		<ProductionContext.Provider value={{ production, productionDispatch }}>
			<Header currentTab={currentTab} handleTabChange={handleTabChange} />
			<TabPanel currentTab={currentTab} id="home">
				<Home />
			</TabPanel>
			<TabPanel currentTab={currentTab} id="now">
				<Now />
			</TabPanel>
		</ProductionContext.Provider>
	);
}
