import { ChangeEvent, useCallback, useRef } from "react";
import Webcam from "react-webcam";

function GetPhoto({ setImage }: { setImage: (src: string | undefined) => void }) {
  const cameraRef = useRef<Webcam>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const onFileChanged = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setImage(file ? URL.createObjectURL(file) : undefined);
  }, []);

  return <>
    <div className='flex-1'>
      <Webcam
        ref={cameraRef}
        className='h-full w-auto' />
    </div>
    <div className='flex gap-4'>
      <input
        className='hidden'
        ref={imageInputRef}
        type='file'
        accept='image/*'
        onChange={onFileChanged}
      />
      <button className='flex-1' onClick={() => { }}>Take photo</button>
      <button className='flex-1' onClick={() => imageInputRef.current!.click()}>Select photo</button>

    </div></>;
}

export default GetPhoto;