import { BadRequestException, Injectable } from '@nestjs/common';
import { REQUIRED_INPUT_COLUMNS } from './required-columns';

@Injectable()
export class InputSpreadsheetValidator {
  validateHeaders(headers: string[]): void {
    const normalizedHeaders = new Set(headers.map((header) => header.trim()));
    const missingColumns = REQUIRED_INPUT_COLUMNS.filter((column) => !normalizedHeaders.has(column));

    if (missingColumns.length > 0) {
      throw new BadRequestException({
        message: 'Invalid spreadsheet',
        missingColumns,
      });
    }
  }
}
