import type { Metadata } from 'next';
import FoodStorageChallengeViewer from '@/components/simulations/FoodStorageChallengeViewer';

export const metadata: Metadata = {
  title: 'The Village Store — Food Storage Challenge',
  description:
    'An open science problem: keep four foods edible for a week in a store with no electricity.',
};

export default function FoodStorageChallengePage() {
  return <FoodStorageChallengeViewer />;
}
