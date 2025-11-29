import Image from 'next/image';

export const Loader = () => {
  return (
    <div className="fixed inset-0 flex items-center justify-center overflow-hidden">
      <div className="relative w-full h-full flex items-center justify-center">
        <Image
          src="/loop-background.png"
          alt="Pachinko Background"
          fill
          className="object-contain md:object-cover "
          priority
        />
        <div className="relative z-10 w-80 h-80 md:w-128 md:h-128 lg:w-160 lg:h-160">
          <Image
            src="/loop.gif"
            alt="Loading..."
            fill
            className="object-contain -rotate-20"
            unoptimized
            priority
          />
        </div>
      </div>
    </div>
  );
};