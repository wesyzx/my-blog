export default function Footer() {
  return (
    <footer className="mt-[50px] pb-[50px] text-center bg-[#f3f4f7]">
      <div className="max-w-[1100px] mx-auto px-4">
        <div className="flex flex-col items-center justify-center text-[13px] text-[#475671] space-y-1">
          <p>
            Copyright © {new Date().getFullYear()} The Unhurried
          </p>
          <p>
            Powered by Next.js
          </p>
        </div>
      </div>
    </footer>
  )
}