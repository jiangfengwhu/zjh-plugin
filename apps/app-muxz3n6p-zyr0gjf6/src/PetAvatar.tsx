import React, { useEffect } from "react";
import { Canvas, Circle, Group, Path, Paint } from "@shopify/react-native-skia";
import { useSharedValue, useDerivedValue, withRepeat, withTiming, withSequence, Easing } from "react-native-reanimated";

type PetEmotion = "happy" | "neutral" | "sad" | "sleepy";

interface PetAvatarProps {
  emotion: PetEmotion;
  size: number;
}

export function PetAvatar({ emotion, size }: PetAvatarProps) {
  const cx = size / 2;
  const cy = size / 2;
  const baseRadius = size * 0.4;

  const breathScale = useSharedValue(1);
  const blinkScale = useSharedValue(1);
  const earRotate = useSharedValue(0);

  useEffect(() => {
    // Breathing animation
    breathScale.value = withRepeat(
      withTiming(emotion === "sleepy" ? 1.05 : 1.02, {
        duration: emotion === "sleepy" ? 2000 : 1500,
        easing: Easing.inOut(Easing.ease)
      }),
      -1,
      true
    );

    // Blinking animation
    const blink = () => {
      blinkScale.value = withSequence(
        withTiming(0.1, { duration: 100 }),
        withTiming(1, { duration: 100 })
      );
    };

    let blinkInterval: ReturnType<typeof setInterval>;
    if (emotion !== "sleepy") {
      blinkInterval = setInterval(() => {
        if (Math.random() > 0.3) blink(); // Random blinking
      }, 3000);
    } else {
      blinkScale.value = withTiming(0.1, { duration: 500 }); // Eyes mostly closed when sleepy
    }

    // Ear wiggling
    if (emotion === "happy") {
      earRotate.value = withRepeat(
        withSequence(
          withTiming(-10, { duration: 200 }),
          withTiming(10, { duration: 200 }),
          withTiming(0, { duration: 200 })
        ),
        -1,
        true
      );
    } else if (emotion === "sad") {
      earRotate.value = withTiming(-15, { duration: 500 });
    } else {
      earRotate.value = withTiming(0, { duration: 500 });
    }

    return () => {
      if (blinkInterval) clearInterval(blinkInterval);
    };
  }, [emotion]);

  const bodyTransform = useDerivedValue(() => {
    return [{ scale: breathScale.value }];
  });

  const eyeScaleY = useDerivedValue(() => {
    return [{ scaleY: blinkScale.value }];
  });

  const leftEarTransform = useDerivedValue(() => {
    // In Skia, rotate is provided in radians (or mapped through Skia transformations differently depending on version),
    // but react-native-skia's Transform3d accepts rotate as a number in radians.
    // Let's use radians for rotation.
    return [
      { translateX: cx - baseRadius * 0.7 },
      { translateY: cy - baseRadius * 0.7 },
      { rotate: earRotate.value * (Math.PI / 180) },
      { translateX: -(cx - baseRadius * 0.7) },
      { translateY: -(cy - baseRadius * 0.7) }
    ];
  });

  const rightEarTransform = useDerivedValue(() => {
    return [
      { translateX: cx + baseRadius * 0.7 },
      { translateY: cy - baseRadius * 0.7 },
      { rotate: -earRotate.value * (Math.PI / 180) },
      { translateX: -(cx + baseRadius * 0.7) },
      { translateY: -(cy - baseRadius * 0.7) }
    ];
  });

  // Calculate eye positions
  const eyeOffsetX = baseRadius * 0.35;
  const eyeOffsetY = -baseRadius * 0.1;
  const eyeRadius = baseRadius * 0.12;

  // Mouth Path
  let mouthPathStr = "";
  if (emotion === "happy") {
    // Smiling mouth
    mouthPathStr = `M ${cx - baseRadius * 0.2} ${cy + baseRadius * 0.15} Q ${cx} ${cy + baseRadius * 0.4} ${cx + baseRadius * 0.2} ${cy + baseRadius * 0.15}`;
  } else if (emotion === "sad") {
    // Sad mouth
    mouthPathStr = `M ${cx - baseRadius * 0.2} ${cy + baseRadius * 0.25} Q ${cx} ${cy + baseRadius * 0.1} ${cx + baseRadius * 0.2} ${cy + baseRadius * 0.25}`;
  } else {
    // Neutral / Sleepy
    mouthPathStr = `M ${cx - baseRadius * 0.1} ${cy + baseRadius * 0.2} L ${cx + baseRadius * 0.1} ${cy + baseRadius * 0.2}`;
  }

  // Ear paths
  const earSize = baseRadius * 0.6;
  const leftEarPath = `M ${cx - baseRadius * 0.8} ${cy - baseRadius * 0.2} L ${cx - baseRadius * 0.4} ${cy - baseRadius * 0.8} L ${cx - baseRadius * 0.9} ${cy - baseRadius * 0.9} Z`;
  const rightEarPath = `M ${cx + baseRadius * 0.8} ${cy - baseRadius * 0.2} L ${cx + baseRadius * 0.4} ${cy - baseRadius * 0.8} L ${cx + baseRadius * 0.9} ${cy - baseRadius * 0.9} Z`;

  // Z's for sleepy
  const zPath = emotion === "sleepy" ? `M ${cx + baseRadius * 0.8} ${cy - baseRadius * 0.5} L ${cx + baseRadius * 1.2} ${cy - baseRadius * 0.5} L ${cx + baseRadius * 0.8} ${cy - baseRadius * 0.9} L ${cx + baseRadius * 1.2} ${cy - baseRadius * 0.9}` : "";


  return (
    <Canvas style={{ width: size, height: size }}>
      <Group transform={bodyTransform} origin={{ x: cx, y: cy }}>
        {/* Ears */}
        <Group transform={leftEarTransform}>
          <Path path={leftEarPath} color="#FFD1BA" />
        </Group>
        <Group transform={rightEarTransform}>
          <Path path={rightEarPath} color="#FFD1BA" />
        </Group>

        {/* Body/Face */}
        <Circle cx={cx} cy={cy} r={baseRadius} color="#FFEFE5" />

        {/* Blushes for happy */}
        {emotion === "happy" && (
          <>
            <Circle cx={cx - baseRadius * 0.5} cy={cy + baseRadius * 0.1} r={baseRadius * 0.15} color="rgba(255, 100, 100, 0.3)" />
            <Circle cx={cx + baseRadius * 0.5} cy={cy + baseRadius * 0.1} r={baseRadius * 0.15} color="rgba(255, 100, 100, 0.3)" />
          </>
        )}

        {/* Eyes */}
        <Group transform={eyeScaleY} origin={{ x: cx - eyeOffsetX, y: cy + eyeOffsetY }}>
          <Circle cx={cx - eyeOffsetX} cy={cy + eyeOffsetY} r={eyeRadius} color="#333" />
        </Group>
        <Group transform={eyeScaleY} origin={{ x: cx + eyeOffsetX, y: cy + eyeOffsetY }}>
          <Circle cx={cx + eyeOffsetX} cy={cy + eyeOffsetY} r={eyeRadius} color="#333" />
        </Group>

        {/* Mouth */}
        <Path path={mouthPathStr} color="#333" style="stroke" strokeWidth={size * 0.02} strokeCap="round" />

        {/* Sleep Zs */}
        {emotion === "sleepy" && (
           <Path path={zPath} color="#aaa" style="stroke" strokeWidth={size * 0.015} strokeCap="round" strokeJoin="round" />
        )}
      </Group>
    </Canvas>
  );
}
