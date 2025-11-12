#include "JsonEx.h"

bool JsonEx::load(const char *path)noexcept{

	std::string buf;
	FILE *fp = nullptr;
	if(fopen_s(&fp, path, "rb") || fp == nullptr){
		return false;
	}

	fseek(fp, 0, SEEK_END);
	auto size = ftell(fp);
	if(size > 0){
		try{
			buf.resize(static_cast<size_t>(size));
		}catch(...){
			fclose(fp);
			return false;
		}
		fseek(fp, 0, SEEK_SET);
		if(fread(&buf[0], 1, static_cast<size_t>(size), fp) != static_cast<size_t>(size)){
			fclose(fp);
			return false;
		}
	}

	fclose(fp);

	auto s = const_cast<char *>(buf.c_str());
	uint32_t line = 1;

	// 空白スキップ
	auto skip_ws = [&s, &line](void)noexcept -> void {
		for(; *s && isspace(static_cast<uint8_t>(*s)); ++s){
			if(*s == '\n'){
				++line;
			}
		}
	};

	// 文字列パース
	auto parse_string = [&s, &line](std::string &value)noexcept -> bool {
		++s;
		auto start = s, d = s;
		for(; *s && *s != '"';){
			if(*s == '\n'){
				*(d++) = *(s++);
				++line;
			}else if(*s == '\\'){
				++s;
				switch(*s){
				case '\"': *(d++) = '\"'; ++s; break;
				case '\\': *(d++) = '\\'; ++s; break;
				case 'b':  *(d++) = '\b'; ++s; break;
				case 'f':  *(d++) = '\f'; ++s; break;
				case 'n':  *(d++) = '\n'; ++s; break;
				case 'r':  *(d++) = '\r'; ++s; break;
				case 't':  *(d++) = '\t'; ++s; break;
				case 'u':
					{
						uint16_t code = 0;
						for(int i = 0; i < 4 && *s; ++i, ++s){
							char h = *s;
							code <<= 4;
							if(h >= '0' && h <= '9')code |= h - '0';
							else if(h >= 'a' && h <= 'f')code |= h - 'a' + 10;
							else if(h >= 'A' && h <= 'F')code |= h - 'A' + 10;
							else break;
						}
						if(code <= 0x7F){
							*(d++) = static_cast<char>(code);
						}else if(code <= 0x7FF){
							*(d++) = static_cast<char>(0xC0 | ((code >> 6) & 0x1F));
							*(d++) = static_cast<char>(0x80 | (code & 0x3F));
						}else{
							*(d++) = static_cast<char>(0xE0 | ((code >> 12) & 0x0F));
							*(d++) = static_cast<char>(0x80 | ((code >> 6) & 0x3F));
							*(d++) = static_cast<char>(0x80 | (code & 0x3F));
						}
						break;
					}
				default:
					*(d++) = *(s++);
					break;
				}
			}else{
				*(d++) = *(s++);
			}
		}
		if(*s == '"'){
			++s;
		}
		*d = '\0';
		try{
			value = start;
		}catch(...){
			return false;
		}
		return true;
	};

	// パース
	auto parse_value = [this, &s, &line, skip_ws, parse_string](auto self, Node &value)noexcept -> bool {
		skip_ws();
		value.line = line;

		// オブジェクト
		if(*s == '{'){
			value.type = Node::Type::object_t;
			++s;
			skip_ws();
			while(*s && *s != '}'){
				Node child{};
				skip_ws();
				if(*s != '"'){
					fprintf(stderr, "Error: %d行目: シンタックスエラー。\n", line);
					return false;
				}
				if(!parse_string(child.key)){
					return false;
				}
				skip_ws();
				if(*s != ':'){
					fprintf(stderr, "Error: %d行目: シンタックスエラー。\n", line);
					return false;
				}
				++s;
				skip_ws();
				if(!self(self, child)){
					return false;
				}
				try{
					value.children.push_back(child);
				}catch(...){
					return false;
				}
				skip_ws();
				if(*s == ','){
					++s;
				}else if(*s == '}'){
					break;
				}else{
					fprintf(stderr, "Error: %d行目: シンタックスエラー。\n", line);
					return false;
				}
				skip_ws();
			}
			if(*s == '}'){
				++s;
			}else{
				fprintf(stderr, "Error: %d行目: シンタックスエラー。\n", line);
				return false;
			}
			return _load(value);
		}

		// 配列
		else if(*s == '['){
			value.type = Node::Type::array_t;
			++s;
			skip_ws();
			while(*s && *s != ']'){
				Node child{};
				if(!self(self, child)){
					return false;
				}
				try{
					value.children.push_back(child);
				}catch(...){
					return false;
				}
				skip_ws();
				if(*s == ','){
					++s;
				}else if(*s == ']'){
					break;
				}else{
					fprintf(stderr, "Error: %d行目: シンタックスエラー。\n", line);
					return false;
				}
				skip_ws();
			}
			if(*s == ']'){
				++s;
			}else{
				fprintf(stderr, "Error: %d行目: シンタックスエラー。\n", line);
				return false;
			}
			return _load(value);
		}

		// 文字列
		else if(*s == '"'){
			value.type = Node::Type::string_t;
			return parse_string(value.value_string) && _load(value);
		}

		// 数値
		else if (isdigit(static_cast<uint8_t>(*s)) || *s == '-'){
			auto p = s + 1;
			while(*p && isdigit(static_cast<uint8_t>(*p))){
				++p;
			}
			if(*p == '.' || *p == 'e'){
				value.type = Node::Type::float_t;
				value.value_float = strtof(s, &s);
			}else{
				value.type = Node::Type::int_t;
				value.value_int = strtol(s, &s, 10);
			}
			return _load(value);
		}

		// true
		else if(strncmp(s, "true", 4) == 0){
			value.type = Node::Type::true_t;
			s += 4;
			return _load(value);
		}

		// false
		else if(strncmp(s, "false", 5) == 0){
			value.type = Node::Type::false_t;
			s += 5;
			return _load(value);
		}

		// null
		else if(strncmp(s, "null", 4) == 0){
			value.type = Node::Type::null_t;
			s += 4;
			return _load(value);
		}

		fprintf(stderr, "Error: %d行目: シンタックスエラー。\n", line);
		return false;
	};

	// パース
	return parse_value(parse_value, _root);
}

bool JsonEx::save(const char *path)noexcept{

	FILE *fp = nullptr;
	if(fopen_s(&fp, path, "wb") || fp == nullptr){
		return false;
	}

	auto write_indent = [fp](int indent)noexcept -> void {
		for(; indent > 0; --indent){
			fputs("  ", fp);
		}
	};
	auto write_string = [fp](const std::string &string)noexcept -> void {
		fputc('"', fp);
		for(auto s = string.c_str(); *s; ++s){
			auto c = static_cast<uint8_t>(*s);
			switch(c){
			case '\"': fputs("\\\"", fp); break;
			case '\\': fputs("\\\\", fp); break;
			case '\b': fputs("\\b", fp); break;
			case '\f': fputs("\\f", fp); break;
			case '\n': fputs("\\n", fp); break;
			case '\r': fputs("\\r", fp); break;
			case '\t': fputs("\\t", fp); break;
			default:
				if(c < 0x20){
					fprintf(fp, "\\u%04x", c);
				}else{
					fprintf(fp, "%c", c);
				}
				break;
			}
		}
		fputc('"', fp);
	};
	auto write = [this, fp, write_indent, write_string](auto self, Node &node, int indent=0)noexcept -> bool {
		switch(node.type){
		case Node::Type::null_t:
			fputs("null", fp);
			break;
		case Node::Type::false_t:
			fputs("false", fp);
			break;
		case Node::Type::true_t:
			fputs("true", fp);
			break;
		case Node::Type::int_t:
			fprintf(fp, "%d", node.value_int);
			break;
		case Node::Type::float_t:
			fprintf(fp, "%.16f", node.value_float);
			break;
		case Node::Type::string_t:
			write_string(node.value_string);
			break;
		case Node::Type::array_t:
			if(node.children.empty()){
				fputs("[]", fp);
			}else{
				fputs("[\n", fp);
				bool is_not_first = false;
				for(auto &child : node.children){
					if(!_save(child)){
						return false;
					}
					if(is_not_first){
						fputs(",\n", fp);
					}else{
						is_not_first = true;
					}
					write_indent(indent + 1);
					if(!self(self, child, indent + 1)){
						return false;
					}
				}
				fputc('\n', fp);
				write_indent(indent);
				fputc(']', fp);
			}
			break;
		case Node::Type::object_t:
			if(node.children.empty()){
				fputs("{}", fp);
			}else{
				fputs("{\n", fp);
				bool is_not_first = false;
				for(auto &child : node.children){
					if(!_save(child)){
						return false;
					}
					if(is_not_first){
						fputs(",\n", fp);
					}else{
						is_not_first = true;
					}
					write_indent(indent + 1);
					write_string(child.key);
					fputs(": ", fp);
					if(!self(self, child, indent + 1)){
						return false;
					}
				}
				fputc('\n', fp);
				write_indent(indent);
				fputc('}', fp);
			}
			break;
		}
		return true;
	};

	if(!_save(_root)){
		fclose(fp);
		return false;
	}
	if(!write(write, _root)){
		fclose(fp);
		return false;
	}

	fclose(fp);

	return true;
}
