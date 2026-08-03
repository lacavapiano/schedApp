function ClientTable({ clients }) {
  if (clients.length === 0) {
    return <p>No clients found.</p>;
  }

  return (
    <table>
      <thead>
        <tr>
          <th>Name</th>
          <th>Email</th>
          <th>Phone</th>
        </tr>
      </thead>

      <tbody>
        {clients.map((client) => (
          <tr key={client.id}>
            <td>
              {client.name}
            </td>
            <td>{client.email}</td>
            <td>{client.phone}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default ClientTable;