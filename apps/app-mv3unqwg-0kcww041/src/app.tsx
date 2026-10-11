import React, { useState, useRef } from 'react';
import { View, Text, TextInput } from 'react-native';
import { WebView } from 'react-native-webview';
import { getAppContext } from '@zijinhua/app-sdk';
import { useTheme, Button, ThemeProvider } from '@zijinhua/app-sdk/ui';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function App() {
  const [company, setCompany] = useState('某某科技');
  const [name, setName] = useState('张三');
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const webviewRef = useRef<WebView>(null);

  React.useEffect(() => {
    if (webviewRef.current) {
      const script = `
        if (window.updateBadge) {
          window.updateBadge(${JSON.stringify(company)}, ${JSON.stringify(name)});
        }
        true;
      `;
      webviewRef.current.injectJavaScript(script);
    }
  }, [company, name]);

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">
        <style>body { margin: 0; overflow: hidden; background-color: #f0f0f0; }</style>
        <script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>
      </head>
      <body>
        <script>
          const scene = new THREE.Scene();
          const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
          const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
          renderer.setSize(window.innerWidth, window.innerHeight);
          document.body.appendChild(renderer.domElement);

          const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
          scene.add(ambientLight);
          const dirLight = new THREE.DirectionalLight(0xffffff, 0.6);
          dirLight.position.set(5, 5, 5);
          scene.add(dirLight);

          const canvas = document.createElement('canvas');
          canvas.width = 512;
          canvas.height = 512;
          const ctx = canvas.getContext('2d');

          let currentCompany = '某某科技';
          let currentName = '张三';

          const drawTexture = () => {
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, 512, 512);

            ctx.fillStyle = '#007bff';
            ctx.fillRect(0, 0, 512, 100);

            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 40px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(currentCompany, 256, 65);

            ctx.fillStyle = '#333333';
            ctx.font = 'bold 80px sans-serif';
            ctx.fillText(currentName, 256, 256);

            ctx.fillStyle = '#666666';
            ctx.font = '30px sans-serif';
            ctx.fillText('STAFF ID: ' + Math.floor(Math.random() * 1000000), 256, 400);
          };

          drawTexture();

          const texture = new THREE.CanvasTexture(canvas);
          const geometry = new THREE.BoxGeometry(3, 4, 0.1);

          const sideMaterial = new THREE.MeshStandardMaterial({ color: 0xcccccc });
          const frontMaterial = new THREE.MeshStandardMaterial({ map: texture });
          const backMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff });

          const materials = [
            sideMaterial, sideMaterial, sideMaterial, sideMaterial,
            frontMaterial, backMaterial
          ];

          const badge = new THREE.Mesh(geometry, materials);
          scene.add(badge);

          const clipGeo = new THREE.CylinderGeometry(0.5, 0.5, 0.2, 32);
          clipGeo.rotateX(Math.PI / 2);
          const clipMat = new THREE.MeshStandardMaterial({ color: 0x444444 });
          const clip = new THREE.Mesh(clipGeo, clipMat);
          clip.position.set(0, 2, 0);
          badge.add(clip);

          camera.position.z = 6;

          let isDragging = false;
          let previousMousePosition = { x: 0, y: 0 };

          document.addEventListener('pointerdown', (e) => {
            isDragging = true;
            previousMousePosition = { x: e.clientX, y: e.clientY };
          });
          document.addEventListener('pointerup', () => { isDragging = false; });
          document.addEventListener('pointermove', (e) => {
            if (isDragging) {
              const deltaMove = {
                x: e.clientX - previousMousePosition.x,
                y: e.clientY - previousMousePosition.y
              };
              badge.rotation.y += deltaMove.x * 0.01;
              badge.rotation.x += deltaMove.y * 0.01;
              previousMousePosition = { x: e.clientX, y: e.clientY };
            }
          });

          const animate = function () {
            requestAnimationFrame(animate);
            if (!isDragging) {
              badge.rotation.y += 0.01;
            }
            renderer.render(scene, camera);
          };

          animate();

          window.addEventListener('resize', () => {
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(window.innerWidth, window.innerHeight);
          });

          window.updateBadge = (newCompany, newName) => {
            currentCompany = newCompany;
            currentName = newName;
            drawTexture();
            texture.needsUpdate = true;
          };
        </script>
      </body>
    </html>
  `;

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.canvas }}>
      <View style={{ paddingTop: insets.top, backgroundColor: theme.colors.surface, paddingBottom: 10 }}>
        <View style={{ paddingHorizontal: 20 }}>
          <Text style={{ fontSize: 20, fontWeight: 'bold', marginVertical: 10, color: theme.colors.text }}>3D 工牌定制</Text>
          <TextInput
            value={company}
            onChangeText={setCompany}
            placeholder="公司名称"
            placeholderTextColor={theme.colors.muted}
            style={{ borderWidth: 1, borderColor: theme.colors.line, padding: 10, marginBottom: 10, borderRadius: theme.colors.radius.md, color: theme.colors.text }}
          />
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="员工姓名"
            placeholderTextColor={theme.colors.muted}
            style={{ borderWidth: 1, borderColor: theme.colors.line, padding: 10, borderRadius: theme.colors.radius.md, color: theme.colors.text }}
          />
        </View>
      </View>
      <WebView
        ref={webviewRef}
        source={{ html }}
        style={{ flex: 1, backgroundColor: 'transparent' }}
        originWhitelist={['*']}
        javaScriptEnabled={true}
        scrollEnabled={false}
        bounces={false}
      />
    </View>
  );
}
