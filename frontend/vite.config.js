import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'url';

export default defineConfig({
	plugins: [react()],
	server: {
		port: 3000,
	},
	resolve: {
		alias: [
			{ find: '@', replacement: fileURLToPath(new URL('./src', import.meta.url)) },
			{ find: '@lib', replacement: fileURLToPath(new URL('./src/lib', import.meta.url)) },
			{ find: '@context', replacement: fileURLToPath(new URL('./src/context', import.meta.url)) },
			{ find: '@hooks', replacement: fileURLToPath(new URL('./src/hooks', import.meta.url)) },
			{ find: '@components', replacement: fileURLToPath(new URL('./src/components', import.meta.url)) },
		],
	},
});
