import { defineConfig } from 'vite';

export default defineConfig({
    // 상대 경로를 사용하여 모든 배포 환경(Firebase, GitHub Pages)에서 리소스 로딩 호환성 확보
    base: './',
    json: {
        stringify: true,
    },
});
