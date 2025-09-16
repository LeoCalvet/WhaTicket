import React, { useState, createContext } from "react";

const SearchMessageContext = createContext();

const SearchMessageProvider = ({ children }) => {
	const [messageId, setMessageId] = useState(null);

	return (
		<SearchMessageContext.Provider
			value={{ messageId, setMessageId }}
		>
			{children}
		</SearchMessageContext.Provider>
	);
};

export { SearchMessageContext, SearchMessageProvider };
