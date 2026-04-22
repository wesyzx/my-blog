export default function Footer() {
    return (
      <footer className="mt-20 pb-10 text-center">
        <div className="max-w-3xl mx-auto px-4">
          <div className="border-t border-gray-100 pt-8 flex justify-between items-center text-sm text-gray-500">
            <p>
              © {new Date().getFullYear()} The Unhurried
            </p>
            <p>
              不慌不忙，记录生活
            </p>
          </div>
        </div>
      </footer>
    )
  }