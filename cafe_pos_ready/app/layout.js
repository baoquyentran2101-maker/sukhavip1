export default function RootLayout({ children }) {
  return (
    <html lang="vi">
      <body style={{margin:0,padding:20,fontFamily:"sans-serif"}}>
        {children}
      </body>
    </html>
  );
}
