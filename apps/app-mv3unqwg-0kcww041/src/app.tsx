import React, { useState, useRef } from 'react';
import { View, Text, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { WebView } from 'react-native-webview';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function App() {
  const [company, setCompany] = useState('某某科技');
  const [name, setName] = useState('张三');
  const insets = useSafeAreaInsets();
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
        <style>body { margin: 0; overflow: hidden; background-color: #050510; }</style>
        <script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>
      </head>
      <body>
        <script>
          const scene = new THREE.Scene();
          scene.fog = new THREE.FogExp2(0x050510, 0.05);

          const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
          const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
          renderer.setSize(window.innerWidth, window.innerHeight);
          renderer.setPixelRatio(window.devicePixelRatio);
          document.body.appendChild(renderer.domElement);

          const ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
          scene.add(ambientLight);

          const dirLight = new THREE.DirectionalLight(0xffffff, 0.5);
          dirLight.position.set(5, 5, 10);
          scene.add(dirLight);

          const light1 = new THREE.PointLight(0x00ffff, 2, 15);
          scene.add(light1);

          const light2 = new THREE.PointLight(0xff00ff, 2, 15);
          scene.add(light2);

          const canvas = document.createElement('canvas');
          canvas.width = 768; // 3:4 aspect ratio
          canvas.height = 1024;
          const ctx = canvas.getContext('2d');

          let currentCompany = '某某科技';
          let currentName = '张三';

          const drawTexture = () => {
            const bgGrad = ctx.createLinearGradient(0, 0, 768, 1024);
            bgGrad.addColorStop(0, '#111122');
            bgGrad.addColorStop(1, '#050510');
            ctx.fillStyle = bgGrad;
            ctx.fillRect(0, 0, 768, 1024);

            ctx.strokeStyle = '#00ffff';
            ctx.lineWidth = 10;
            ctx.strokeRect(20, 20, 728, 984);

            ctx.fillStyle = 'rgba(0, 255, 255, 0.1)';
            ctx.fillRect(20, 20, 728, 250);

            ctx.fillStyle = '#00ffff';
            ctx.font = 'bold 50px sans-serif';
            ctx.textAlign = 'center';
            ctx.shadowColor = '#00ffff';
            ctx.shadowBlur = 10;
            ctx.fillText(currentCompany, 384, 180);

            ctx.beginPath();
            ctx.moveTo(100, 270);
            ctx.lineTo(668, 270);
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 2;
            ctx.stroke();

            ctx.shadowBlur = 0;

            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 120px sans-serif';
            ctx.fillText(currentName, 384, 550);

            ctx.fillStyle = '#aaaaaa';
            ctx.font = '40px sans-serif';
            ctx.fillText('SPECIALIST', 384, 650);

            ctx.fillStyle = '#ff00ff';
            ctx.font = 'bold 35px monospace';
            ctx.shadowColor = '#ff00ff';
            ctx.shadowBlur = 8;
            ctx.fillText('ID: ' + Math.floor(Math.random() * 100000000).toString().padStart(8, '0'), 384, 900);
            ctx.shadowBlur = 0;
          };

          drawTexture();

          const texture = new THREE.CanvasTexture(canvas);
          texture.anisotropy = renderer.capabilities.getMaxAnisotropy();

          const geometry = new THREE.BoxGeometry(4, 5.33, 0.15); // 3:4 aspect ratio

          const sideMaterial = new THREE.MeshPhysicalMaterial({
            color: 0x222222,
            metalness: 0.9,
            roughness: 0.2,
            clearcoat: 1.0,
            clearcoatRoughness: 0.1
          });
          const frontMaterial = new THREE.MeshPhysicalMaterial({
            map: texture,
            metalness: 0.2,
            roughness: 0.1,
            clearcoat: 1.0,
            clearcoatRoughness: 0.1
          });
          const backMaterial = new THREE.MeshPhysicalMaterial({
            color: 0x111122,
            metalness: 0.5,
            roughness: 0.5
          });

          const materials = [
            sideMaterial, sideMaterial, sideMaterial, sideMaterial,
            frontMaterial, backMaterial
          ];

          const badge = new THREE.Mesh(geometry, materials);
          scene.add(badge);

          const clipGeo = new THREE.CylinderGeometry(0.6, 0.6, 0.3, 32);
          clipGeo.rotateX(Math.PI / 2);
          const clipMat = new THREE.MeshPhysicalMaterial({
            color: 0xdddddd,
            metalness: 1.0,
            roughness: 0.2
          });
          const clip = new THREE.Mesh(clipGeo, clipMat);
          clip.position.set(0, 2.66, 0);
          badge.add(clip);

          camera.position.z = 8;

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

              badge.rotation.x = Math.max(-Math.PI/3, Math.min(Math.PI/3, badge.rotation.x));

              previousMousePosition = { x: e.clientX, y: e.clientY };
            }
          });

          const clock = new THREE.Clock();

          const animate = function () {
            requestAnimationFrame(animate);

            const time = clock.getElapsedTime();

            if (!isDragging) {
              badge.rotation.y = Math.sin(time * 0.5) * 0.2;
              badge.rotation.x = Math.cos(time * 0.3) * 0.1;
            }

            light1.position.x = Math.sin(time * 1.5) * 5;
            light1.position.y = Math.cos(time * 1.2) * 5;
            light1.position.z = Math.sin(time * 0.8) * 4 + 4;

            light2.position.x = Math.cos(time * 1.3) * 6;
            light2.position.y = Math.sin(time * 1.7) * 6;
            light2.position.z = Math.cos(time * 0.9) * 4 + 4;

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
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: '#050510' }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={{ flex: 1 }}>
        <WebView
          ref={webviewRef}
          source={{ html }}
          style={{ flex: 1, backgroundColor: 'transparent' }}
          originWhitelist={['*']}
          javaScriptEnabled={true}
          scrollEnabled={false}
          bounces={false}
        />

        <View style={{
          position: 'absolute',
          bottom: insets.bottom + 20,
          left: 20,
          right: 20,
          backgroundColor: 'rgba(255, 255, 255, 0.15)',
          borderRadius: 20,
          padding: 20,
          borderWidth: 1,
          borderColor: 'rgba(255, 255, 255, 0.3)',
        }}>
          <Text style={{
            fontSize: 18,
            fontWeight: '600',
            marginBottom: 15,
            color: '#fff',
            textAlign: 'center'
          }}>定制专属工牌</Text>

          <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 10 }}>
            <TextInput
              value={company}
              onChangeText={setCompany}
              placeholder="公司名称"
              placeholderTextColor="rgba(255, 255, 255, 0.5)"
              style={{
                flex: 1,
                backgroundColor: 'rgba(0, 0, 0, 0.4)',
                borderWidth: 1,
                borderColor: 'rgba(255, 255, 255, 0.2)',
                padding: 12,
                borderRadius: 12,
                color: '#fff',
                fontSize: 16
              }}
            />
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="员工姓名"
              placeholderTextColor="rgba(255, 255, 255, 0.5)"
              style={{
                flex: 1,
                backgroundColor: 'rgba(0, 0, 0, 0.4)',
                borderWidth: 1,
                borderColor: 'rgba(255, 255, 255, 0.2)',
                padding: 12,
                borderRadius: 12,
                color: '#fff',
                fontSize: 16
              }}
            />
          </View>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
