import { useEffect, useRef, useState } from "react";
import "../styles/ClientSearchSelect.css";

function ClientSearchSelect({
  clients,
  value,
  onChange,
  onCreateClient,
  disabled = false,
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);

  const selectedClient = clients.find(
    (client) => client.id === value
  );

  const filteredClients = clients.filter((client) =>
    client.name
      ?.toLowerCase()
      .includes(searchTerm.toLowerCase())
  );

  useEffect(() => {
    function handleClickOutside(event) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target)
      ) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener(
        "mousedown",
        handleClickOutside
      );
    };
  }, []);

  function handleSelect(client) {
    onChange(client.id);
    setSearchTerm("");
    setOpen(false);
  }

  function handleCreateClient() {
    setOpen(false);
    setSearchTerm("");
    onCreateClient();
  }

  return (
    <div
      className="client-search-select"
      ref={containerRef}
    >
      <div className="client-search-input-wrapper">
        <input
          type="text"
          value={
            open
              ? searchTerm
              : selectedClient?.name || ""
          }
          placeholder="Search clients..."
          disabled={disabled}
          onFocus={() => {
            if (!disabled) {
              setSearchTerm("");
              setOpen(true);
            }
          }}
          onChange={(event) => {
            setSearchTerm(event.target.value);
            setOpen(true);
          }}
        />

        <button
          type="button"
          className="client-search-toggle"
          onClick={() => {
            if (!disabled) {
              setOpen((previous) => !previous);
            }
          }}
          disabled={disabled}
          aria-label="Toggle client list"
        >
          ▾
        </button>
      </div>

      {open && !disabled && (
        <div className="client-search-dropdown">
          {filteredClients.length > 0 ? (
            filteredClients.map((client) => (
              <button
                type="button"
                className={`client-search-option ${
                  client.id === value
                    ? "selected"
                    : ""
                }`}
                key={client.id}
                onClick={() => handleSelect(client)}
              >
                <span>{client.name}</span>

                {client.type && (
                  <small>
                    {client.type === "institution"
                      ? "Institution"
                      : "Individual"}
                  </small>
                )}
              </button>
            ))
          ) : (
            <div className="client-search-empty">
              No clients found.
            </div>
          )}

          <button
            type="button"
            className="client-search-create"
            onClick={handleCreateClient}
          >
            + New Client
          </button>
        </div>
      )}
    </div>
  );
}

export default ClientSearchSelect;