import { useEffect, useState } from 'react'
import './App.scss'
import GetPhoto from './components/GetPhoto';
import DrawSudoku from './components/DrawSudoku';
import SolveSudoku from './components/SolveSudoku';

declare type AutoSudokuStep = 'GetPhoto' | 'DrawSudoku' | 'SolveSudoku';

function App() {
  const [step, setStep] = useState<AutoSudokuStep>('GetPhoto')
  const [image, setImage] = useState<string>();
  const [digits, setDigits] = useState<(number | null)[][]>([]);

  useEffect(() => {
    if (image && image.length > 0) {
      setStep('DrawSudoku');
    }
  }, [image])

  const onReadyToSolve = (digits: (number | null)[][]) => {
    setDigits(digits);
    setStep('SolveSudoku');
  };

  let content = <></>;
  switch (step) {
    case 'GetPhoto':
      content = <GetPhoto setImage={setImage} />;
      break;
    case 'DrawSudoku':
      content = <DrawSudoku image={image!} onReadyToSolve={onReadyToSolve} />
      break;
    case 'SolveSudoku':
      content = <SolveSudoku existingDigits={digits} />
      break;
  }

  return (<>
    <div className='h-screen flex flex-col w-screen max-w-[600px] p-4'>
      {content}
    </div>
  </>
  )
}

export default App
