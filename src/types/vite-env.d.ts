/// <reference types="vite/client" />

interface PuterGlobal {
	ai: {
		img2txt: (input: File | string) => Promise<string>;
	};
}

interface Window {
	puter?: PuterGlobal;
}
