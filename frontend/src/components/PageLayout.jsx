function PageLayout({ title, children }) {
	return (
		<main style={{ padding: "2rem" }}>
			<h1>{title}</h1>
			{children}
		</main>
	);
}

export default PageLayout;