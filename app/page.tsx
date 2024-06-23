import TranslationForm from '../components/TranslationForm';
import TranslationResult from '../components/TranslationResult';

export default function Home() {
  return (
    <main className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-4">Translation App</h1>
      <TranslationForm />
      <TranslationResult />
    </main>
  );
}