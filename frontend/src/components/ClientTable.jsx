import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/ClientTable.css";

function ClientTable({ clients, onEdit, onDelete }) {
  const [sortField, setSortField] = useState("name");
  const [sortDirection, setSortDirection] = useState("asc");
  const navigate = useNavigate();

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const getPrimaryEmail = (client) => {
    const emails = client.client_emails ?? [];

    const primary = emails.find((email) => email.is_primary);

    return primary?.email || emails[0]?.email || "";
  };

  const getPrimaryPhone = (client) => {
    const phones = client.client_phones ?? [];

    const primary = phones.find((phone) => phone.is_primary);

    return primary?.phone || phones[0]?.phone || "";
  };

  const sortedClients = [...clients].sort((a, b) => {
    let valueA;
    let valueB;

    if (sortField === "phone") {
      valueA = getPrimaryPhone(a);
      valueB = getPrimaryPhone(b);
    } else if (sortField === "email") {
      valueA = getPrimaryEmail(a);
      valueB = getPrimaryEmail(b);
    } else {
      valueA = a[sortField] ?? "";
      valueB = b[sortField] ?? "";
    }

    const emptyA = String(valueA).trim() === "";
    const emptyB = String(valueB).trim() === "";

    if (emptyA && !emptyB) return 1;
    if (!emptyA && emptyB) return -1;
    if (emptyA && emptyB) return 0;

    const comparison = String(valueA).localeCompare(
      String(valueB),
      undefined,
      {
        numeric: true,
        sensitivity: "base",
      }
    );

    return sortDirection === "asc" ? comparison : -comparison;
  });

  const getSortIndicator = (field) => {
    if (sortField !== field) {
      return "";
    }

    return sortDirection === "asc" ? " ↑" : " ↓";
  };

  if (clients.length === 0) {
    return (
      <div className="client-table-container">
        <p>No clients found.</p>
      </div>
    );
  }

  return (
    <div className="client-table-container">
      <table className="client-table">
        <thead>
          <tr>
            <th
              onClick={() => handleSort("name")}
              className="sortable-header"
            >
              Name{getSortIndicator("name")}
            </th>

            <th
              onClick={() => handleSort("type")}
              className="sortable-header"
            >
              Type{getSortIndicator("type")}
            </th>

            <th
              onClick={() => handleSort("phone")}
              className="sortable-header phone-column"
            >
              Phone{getSortIndicator("phone")}
            </th>

            <th
              onClick={() => handleSort("email")}
              className="sortable-header"
            >
              Email{getSortIndicator("email")}
            </th>

            <th className="action-header">Edit</th>
            <th className="action-header">Delete</th>
          </tr>
        </thead>

        <tbody>
          {sortedClients.map((client) => (
            <tr key={client.id}>
              <td>
                <button
                  className="client-name-button"
                  onClick={() => navigate(`/clients/${client.id}`)}
                >
                  {client.name}
                </button>
              </td>

              <td>
                {client.type === "institution"
                  ? "Institution"
                  : "Individual"}
              </td>

              <td className="phone-column">
                {getPrimaryPhone(client) || "—"}
              </td>

              <td>
                {getPrimaryEmail(client) || "—"}
              </td>

              <td>
                <button
                  className="table-action-button edit-button"
                  onClick={() => onEdit(client)}
                >
                  Edit
                </button>
              </td>

              <td>
                <button
                  className="table-action-button delete-button"
                  onClick={() => onDelete(client)}
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default ClientTable;